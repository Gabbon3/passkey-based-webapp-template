import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import msgpack from 'msgpack-lite';
import { PasskeyService } from "../services/passkey.service.js";
import { Bytes } from "../utils/bytes.util.js";

export class PasskeyController {
    constructor() {
        this.service = new PasskeyService();
    }
    /**
     * Gestisce la richiesta per ottenere le opzioni di registrazione (fase 1 del flusso WebAuthn).
     */
    startRegistration = asyncHandler(async (req, res) => {
        const { email } = req.body;
        // ---
        const options = await this.service.start_registration(email);
        // -- codifico con msgpack per compattare e mantenere i dati
        const encoded_options = Bytes.base64.encode(msgpack.encode(options));
        // ---
        res.status(200).json({ options: encoded_options });
    });
    /**
     * Gestisce la risposta della registrazione inviata dal client (fase 2 del flusso WebAuthn).
     */
    completeRegistration = asyncHandler(async (req, res) => {
        const { publicKeyCredential: encodedPublicKeyCredential, email } = req.body;
        const publicKeyCredential = msgpack.decode(Bytes.base64.decode(encodedPublicKeyCredential));
        // --
        await this.service.complete_registration(publicKeyCredential, email);
        // ---
        res.status(201).json({ message: 'Passkey added successfully.' });
    });
    /**
     * Genera delle opzioni di accesso (la challenge)
     */
    getAuthOptions = asyncHandler(async (req, res) => {
        const { uid } = req.cookies;
        // ---
        const { challenge, request_id, credentials_id } = await this.service.generate_auth_options(uid ?? null);
        // ---
        res.status(201).json({
            request_id,
            challenge: Bytes.base64.encode(challenge),
            credentials_id,
        });
    });
    /**
     * Restituisce la lista di tutte le passkey
     */
    list = asyncHandler(async (req, res) => {
        const passkeys = await this.service.list(req.user.uid);
        // ---
        res.status(200).json(passkeys);
    });
    /**
     * Rinonima una passkey
     */
    rename = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        // ---
        const [affectedCount] = await this.service.update(id, { name });
        // ---
        res.status(200).json({ message: 'Passkey renamed successfully.' });
    });
    /**
     * Elimina una passkey
     */
    delete = asyncHandler(async (req, res) => {
        const { id } = req.params;
        // ---
        const deleted = await this.service.delete(id, req.user.uid);
        if (!deleted) {
            throw new CError('', 'Passkey not found.', 404);
        }
        // ---
        res.status(200).json({ deleted: true });
    });
}