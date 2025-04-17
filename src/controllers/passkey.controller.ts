import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import msgpack from "msgpack-lite";
import { PasskeyService } from "../services/passkey.service.js";
import { Bytes } from "../utils/bytes.util.js";

export class PasskeyController {
    private service: PasskeyService;

    constructor() {
        this.service = new PasskeyService();
    }

    /**
     * Gestisce la richiesta per ottenere le opzioni di registrazione (fase 1 del flusso WebAuthn).
     */
    startRegistration = asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body as { email: string };
        const options = await this.service.start_registration(email);
        const encodedOptions = Bytes.base64.encode(msgpack.encode(options));
        res.status(200).json({ options: encodedOptions });
    });

    /**
     * Gestisce la risposta della registrazione inviata dal client (fase 2 del flusso WebAuthn).
     */
    completeRegistration = asyncHandler(async (req: Request, res: Response) => {
        const { publicKeyCredential: encodedPublicKeyCredential, email } = req.body as {
            publicKeyCredential: string;
            email: string;
        };
        const publicKeyCredential = msgpack.decode(Bytes.base64.decode(encodedPublicKeyCredential));
        await this.service.complete_registration(publicKeyCredential, email);
        res.status(201).json({ message: "Passkey added successfully." });
    });

    /**
     * Genera delle opzioni di accesso (la challenge)
     */
    getAuthOptions = asyncHandler(async (req: Request, res: Response) => {
        const { uid } = req.cookies as { uid?: string };
        const { challenge, request_id, credentials_id } = await this.service.generateAuthOptions(uid ?? undefined);
        res.status(201).json({
            request_id,
            challenge: Bytes.base64.encode(challenge),
            credentials_id,
        });
    });

    /**
     * Restituisce la lista di tutte le passkey
     */
    list = asyncHandler(async (req: Request, res: Response) => {
        const passkeys = await this.service.list(req.user.uid);
        res.status(200).json(passkeys);
    });

    /**
     * Rinonima una passkey
     */
    rename = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name } = req.body as { name: string };
        const [affectedCount] = await this.service.update(id, { name });
        res.status(200).json({ message: "Passkey renamed successfully." });
    });

    /**
     * Elimina una passkey
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const deleted = await this.service.delete(BigInt(id), req.user.uid);
        if (!deleted) {
            throw new CError("", "Passkey not found.", 404);
        }
        res.status(200).json({ deleted: true });
    });
}