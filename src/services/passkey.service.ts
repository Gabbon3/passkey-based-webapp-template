import { CError } from "../helpers/cError.js";
import { Passkey } from "../models/passkey.model.js";
import { User } from "../models/user.model.js";
import { Mailer } from "../lib/mailer.js";
import { RamDB } from "../utils/ramdb.js";
import { Fido2Lib } from "fido2-lib";
import { Bytes } from "../utils/bytes.util.js";
import { v7 as uuidv7, parse as uuidParse } from 'uuid';
import { Config } from "../serverConfig.js"; 

export const fido2 = new Fido2Lib({
    timeout: 60000,
    rpId: Config.RPID,
    rpName: "Vortex Vault",
    challengeSize: 32,
    attestation: 'direct'
});

interface RegistrationCredentials {
    id: Uint8Array;
    rawId: Uint8Array;
    response: {
        attestationObject: Uint8Array;
        clientDataJSON: Uint8Array;
    };
}

interface AuthOptions {
    challenge: Uint8Array;
    request_id: string;
    credentials_id: string[] | null;
}

interface PasskeyRegistrationOptions {
    user: {
        id: Uint8Array,
        name: string,
        displayName: string
    },
    challenge: Uint8Array,
    rp: {
        name: string,
        id: string | undefined,
    },
    authenticatorSelection: {
        authenticatorAttachment: string,
        requireResidentKey: boolean,
        userVerification: string,
    },
    pubKeyCredParams: [
        { type: string, alg: number },
        { type: string, alg: number },
    ]
}

export class PasskeyService {
    static rpName = "Vortex Vault";
    static rpId = Config.RPID;
    static origin: string | undefined = Config.ORIGIN;
    // ---
    constructor() {}

    /**
     * Genera le opzioni di registrazione per un utente.
     *
     * @param {string} email - email dell'utente che sta cercando di registrarsi.
     * @returns {object} - Le opzioni di registrazione da inviare al client.
     * @throws {CError} - Se l'utente non viene trovato.
     */
    async start_registration(email: string): Promise<any> {
        const user = await User.findOne({
            where: { email },
        });
        if (!user) throw new CError("UserNotFound", "User not found", 422);
        // -- l'account dell'utente deve essere verificato affinche possa essere attivata una nuova passkey
        if (!user.verified) throw new CError("", "You're not able to register any passkey to this account.", 403);
        // -- genero la challenge e le options
        const options = await fido2.assertionOptions() as PasskeyRegistrationOptions;
        options.user = {
            id: uuidParse(user.id),
            name: user.email,
            displayName: user.email.split('@')[0],
        };
        options.challenge = new Uint8Array(options.challenge);
        options.rp = {
            name: PasskeyService.rpName,
            id: PasskeyService.rpId,
        }
        options.authenticatorSelection = {
            authenticatorAttachment: "platform", // "cross-platform" per dispositivi esterni
            requireResidentKey: false, // Cambia a true per resident key
            userVerification: "preferred", // "required" per maggiore sicurezza
        };
        options.pubKeyCredParams = [
            { type: "public-key", alg: -7 }, // ES256: ECDSA w/ SHA-256
            { type: "public-key", alg: -257 }, // RS256: RSASSA-PKCS1-v1_5 w/ SHA-256
        ];
        // -- salvo nel RamDB
        RamDB.set(`psk-chl-${email}`, { challenge: options.challenge, user_id: user.id }, 60);
        // ---
        return options;
    }

    /**
     * Completa la registrazione di una passkey
     * @param {object} credentials
     * @returns {boolean}
     */
    async complete_registration(credentials: RegistrationCredentials, email: string): Promise<boolean> {
        const entry = RamDB.get(`psk-chl-${email}`);
        if (!entry) throw new CError("", "Request expired", 400);
        // -- valido i dati in ingresso
        if (!credentials?.id || !credentials?.response?.attestationObject || !credentials?.response?.clientDataJSON) {
            throw new CError("InvalidCredentials", "The provided credentials are incomplete.", 400);
        }
        // ---
        const { challenge, user_id } = entry;
        // -- verifico la challenge
        let attestation: any = null;
        try {
            attestation = await fido2.attestationResult({
                id: credentials.id,
                rawId: credentials.rawId.buffer,
                response: {
                    attestationObject: credentials.response.attestationObject.buffer as any,
                    clientDataJSON: credentials.response.clientDataJSON.buffer as any,
                },
            }, { challenge: challenge, origin: PasskeyService.origin as string, factor: "either", });
        } catch (error) {
            // console.warn(error);
            throw new CError("AttestationFailed", "Passkey verification failed.", 400);
        }
        // -- verifiche sulla challenge
        if (attestation.audit.validExpectations !== true) {
            throw new CError("AttestationFailed", "Passkey verification failed.", 400);
        }
        // -- estraggo i dati necessari
        const credential_id = Bytes.base64.encode(attestation.authnrData.get('credId'), true);
        const public_key = attestation.authnrData.get('credentialPublicKeyPem'); // Chiave pubblica in formato PEM
        const sign_count = attestation.authnrData.get('counter');
        const attestation_format = attestation.fmt;
        // -- salvo sul db
        await Passkey.create({
            credential_id,
            public_key,
            sign_count,
            user_id,
            attestation_format,
        });
        // -- invio la mail
        // const { text, html } = automated_mails.newPasskeyAdded(email);
        // Mailer.send(email, "New Passkey", text, html);
        RamDB.delete(`psk-chl-${email}`);
        // ---
        return true;
    }

    /**
     * Genera le opzioni di autenticazione per l'utente.
     * @param {string} uid - l'id dell'utente, per restituire le credenziali associate
     * @returns {object} - Le opzioni di autenticazione da inviare al client.
     */
    async generateAuthOptions(uid?: string): Promise<AuthOptions> {
        let credentials_id: string[] | null = null;
        // -- se è stato passato lo user id recupero le passkey associate
        if (uid) {
            const credentials = await Passkey.findAll({
                where: { user_id: uid },
                attributes: ['credential_id']
            });
            credentials_id = credentials.map((cred: any) => cred.credential_id);
        }
        const request_id = uuidv7();
        // -- creo una challenge unica
        const options = await fido2.assertionOptions();
        const challenge = new Uint8Array(options.challenge);
        // -- salvo nel RamDB
        RamDB.set(`chl-${request_id}`, challenge, 60);
        // -- invio la challenge e la request id
        return { challenge, request_id, credentials_id };
    }

    /**
     * Restituisce la lista di tutte le passkeys
     * @param {number} uid 
     */
    async list(uid: number) {
        return await Passkey.findAll({ 
            where: { user_id: uid },
            attributes: ['id', 'name', 'created_at', 'updated_at']
        });
    }

    /**
     * Aggiorna un qualunque campo della passkey
     * @param {string} id
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns {Array} [affectedCount]
     */
    async update(id: string, updated_info: Record<string, any>): Promise<[number]> {
        return await Passkey.update(
            updated_info,
            { where: { id } }
        );
    }

    /**
     * Elimina una passkey
     * @param {BigInt} id 
     * @param {number} uid 
     */
    async delete(id: bigint, uid: number): Promise<number> {
        return await Passkey.destroy({
            where: {
                user_id: uid,
                id: id
            }
        });
    }
}
