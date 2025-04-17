import { asyncHandler } from "../asyncHandler.middleware.js";
import { CError } from "../../helpers/cError.js";
import { RamDB } from "../../utils/ramdb.js";
import { Bytes } from "../../utils/bytes.util.js";
import msgpack from "msgpack-lite";
import { Passkey } from "../../models/passkey.model.js";
import { fido2 } from "../../services/passkey.service.js";
import { JWT } from "../../utils/jwt.util.js";
import { Config } from "../../serverConfig.js";
import { NextFunction } from "express";
import { AuthenticatedRequest } from "../../interfaces/AuthenticatedRequest.js";

interface PasskeyRequestBody {
    bypass_token?: string,
    request_id?: string,
    auth_data?: string,
}

/**
 * Funzione che verifica la passkey, con la possibilità di rendere la verifica obbligatoria.
 * Restituisce una funzione middleware asincrona per Express incapsulata con asyncHandler.
 * 
 * @param {boolean} required true per richiedere la verifica della passkey, false per bypassare con il token JWT
 * @returns {function} Middleware asincrono con gestione degli errori tramite asyncHandler
 */
export const verifyPasskey = (required: boolean = false) => {
    return asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        /**
         * Verifico se ce un bypass token
         */
        const { bypass_token } = req.body as PasskeyRequestBody;
        if (bypass_token) {
            const payload = RamDB.get(`byp-${bypass_token}`);
            if (payload) {
                req.user = { 
                    uid: payload.uid,
                    email: "" // TODO: da gestire la mail
                };
                return next();
            }
        }

        const { request_id, auth_data } = req.body as PasskeyRequestBody;

        /**
         * VERIFICA JWT PER BYPASS SUL CONTROLLO DELLA PASSKEY
         */
        const cookie_jwt = req.cookies.passkey_token ?? null;
        if (required === false && cookie_jwt && !request_id) {
            const payload = JWT.verify(cookie_jwt, 'passkey');
            if (payload) {
                req.user = {
                    uid: payload.uid,
                    email: "", // TODO: da gestire email
                };
                return next();
            }
        }

        /**
         * CONTROLLO SULLA PASSKEY
         */
        if (!request_id || !auth_data) throw new CError("", "Invalid request", 422);

        // -- decodifico gli auth data
        const credential = msgpack.decode(Bytes.base64.decode(auth_data));

        // -- recupero la challenge dal ramdb
        const challenge = RamDB.get(`chl-${request_id}`);
        if (!challenge) throw new CError("", "Auth request expired", 400);

        // -- recupero la passkey
        const passkey = await Passkey.findOne({
            where: { credential_id: credential.id },
        });
        if (!passkey) throw new CError("", "Passkey not found", 404);

        // -- verifico la challenge
        try {
            const assertionResult = await fido2.assertionResult(
                {
                    id: credential.id,
                    rawId: credential.rawId.buffer,
                    response: {
                        authenticatorData: credential.response.authenticatorData.buffer,
                        clientDataJSON: credential.response.clientDataJSON.buffer,
                        signature: credential.response.signature.buffer,
                    },
                },
                {
                    challenge,
                    origin: Config.ORIGIN as string,
                    factor: "either",
                    publicKey: passkey.publicKey,
                    prevCounter: passkey.signCount,
                    userHandle: credential.userHandle
                }
            );
            // -- aggiorno sign_count e salvo la passkey
            passkey.signCount = assertionResult.authnrData.get("counter");
            passkey.updatedAt = new Date();
            await passkey.save({
                silent: true
            });
        } catch (error) {
            console.warn(error);
            throw new CError("", "Authentication failed", 401);
        }

        /**
         * Se i controlli passano, genero il JWT
         */
        const jwt = JWT.create({ 
            uid: passkey.userId, 
            email: "" 
        }, 5 * 60, 'passkey');
        res.cookie('passkey_token', jwt, {
            httpOnly: true,
            secure: true,
            maxAge: JWT.passkey_token_lifetime * 1000,
            sameSite: 'Strict',
            path: '/',
        });

        // -- rimuovo la challenge dal DB
        RamDB.delete(`chl-${request_id}`);

        // -- imposto l'utente nel request
        req.user = { uid: passkey.user_id };
        next();
    });
};