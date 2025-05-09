import { Bytes } from "../utils/bytes.js";
import { API } from "../utils/api.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";

export class PasskeyService {
    /**
     * Registra una nuova passkey
     * @param {string} email 
     * @returns {boolean}
     */
    static async activateNewPasskey(email, request_id = null, code = null) {
        const req = await API.fetch(`/api/passkey/new`, {
            method: "POST",
            body: { email, request_id, code }
        });
        if (!req) return false;
        // ---
        const options = msgpack.decode(Bytes.base64.decode(req.options));
        // -- genero le credenziali
        let credential = null;
        try {
            credential = await navigator.credentials.create({
                publicKey: options,
            });
        } catch (error) {
            console.log('Aborted', error);
            return null;
        }
        // -- preparo i dati da inviare al server
        const publicKeyCredential = {
            id: credential.id,
            rawId: new Uint8Array(credential.rawId),
            response: {
                attestationObject: new Uint8Array(
                    credential.response.attestationObject
                ),
                clientDataJSON: new Uint8Array(
                    credential.response.clientDataJSON
                ),
            },
            type: credential.type,
        };
        // --- invio al server
        const res = await API.fetch("/api/passkey/complete", {
            method: "POST",
            body: {
                publicKeyCredential: Bytes.base64.encode(
                    msgpack.encode(publicKeyCredential)
                ),
                email,
            },
        });
        // ---
        console.log(res);
        if (!res) return false;
        return true;
    }
    /**
     * Fa firmare una challenge generata dal server per validare la passkey restituendo gli auth data
     * @returns {object} request id (per identificare la richiesta) e auth data (per autenticarsi)
     */
    static async getAuthData() {
        const chl_req_id = await API.fetch(`/api/passkey/`, {
            method: "GET",
        });
        if (!chl_req_id) return false;
        // ---
        const { request_id, challenge: challenge_base64, credentials_id } = chl_req_id;
        // -- decodifico la challenge
        const challenge = Bytes.base64.decode(challenge_base64);
        // -- restituisco le credenziali disponibili
        let allowCredentials = null;
        if (credentials_id instanceof Array && credentials_id.length > 0) {
            allowCredentials = credentials_id.map(cred_id => ({
                type: 'public-key',
                id: Bytes.base64.decode(cred_id, true)
            }));
        }
        // -- creo l'oggetto per la richiesta di autenticazione
        const publicKey = {
            challenge,
            userVerification: "preferred",
            timeout: 60000,
        };
        // ---
        if (allowCredentials) publicKey.allowCredentials = allowCredentials;
        // -- seleziono la passkey e firmo
        let credential = null;
        try {
            credential = await navigator.credentials.get({ publicKey });
        } catch (error) {
            console.warn('Passkey auth request Aborted', error);
            return null;
        } 
        // -- restituisco i dati grazie al quale il server può validare la passkey
        const auth_data = {
            request_id,
            id: credential.id,
            rawId: new Uint8Array(credential.rawId),
            response: {
                authenticatorData: new Uint8Array(credential.response.authenticatorData),
                clientDataJSON: new Uint8Array(credential.response.clientDataJSON),
                signature: new Uint8Array(credential.response.signature),
            },
            userHandle: credential.response.clientDataJSON.userHandle,
        };
        return auth_data;
    }
    /**
     * Effettua in maniera dinamica un'autenticazione tramite passkey indicando l'endpoint necessario
     * @param {object} options 
     * @param {string} [options.endpoint] qualsiasi endpoint del server
     * @param {string} [options.method] POST, GET...
     * @param {object} [options.body], dati 
     * @param {boolean} [options.passkey_need] se true viene forzato l'utilizzo della passkey
     * @param {Function} callback 
     * @returns {boolean}
     */
    static async authenticate(options, callback = null) {
        if (!options.endpoint) return false;
        // -- verifico che il body non contenga le opzioni usate già dal service per far funzionare l'autenticazione
        if (options.body && (options.body.request_id || options.body.auth_data)) throw new Error("Invalid options properties, request_id & auth_data can't be used in this context");
        /**
         * Verifico se l'utente si è già autenticato di recente con la passkey
         */
        let auth_data = null;
        let request_id = null;
        let body = options.body ?? {};
        const bypass_token = options.body?.bypass_token ? true : false;
        // -- definisco dei valori predefiniti delle options
        const opt = {
            method: 'POST',
            ...options,
        };
        // ---
        const passkey_token = await LocalStorage.get('passkey-token-expire');
        const passkey_token_is_valid = passkey_token instanceof Date && passkey_token > new Date();
        /**
         * se è presente un bypass token skippo questa parte
         * Se non si è già autenticato chiedo al client di firmare una challenge
         * oppure se è richiesta la passkey
         */
        if (bypass_token === false && (!passkey_token_is_valid || options.passkey_need === true)) {
            // -- ottengo gli auth data e la request id
            auth_data = await this.getAuthData();
            if (!auth_data) return auth_data;
            // -- ottengo l'id della richiesta per farla identificare dal middleware
            request_id = auth_data.request_id;
            delete auth_data.request_id;
            // --
            body = {
                ...body,
                request_id,
                auth_data: Bytes.base64.encode(msgpack.encode(auth_data)),
            }
        }
        // -- invio all'endpoint scelto la risposta
        const response = await API.fetch(opt.endpoint, {
            method: opt.method,
            body,
        });
        // -- se ce stato un errore probabilmente è per la passkey
        // - quindi elimino dal localstorage la traccia di passkey token cosi alla prossima richiesta l'utente usa la passkey
        if (!response) {
            if (passkey_token_is_valid && !options.passkey_need && API.recent.status == 422) {
                LocalStorage.remove('passkey-token-expire');
                Log.summon(1, 'Try again');
            }
            return false;
        }
        // -- se ce stata una risposta e non è ancora stato abilitato il passkey token lo imposto
        if ((!passkey_token_is_valid || options.passkey_need === true) && !bypass_token) await LocalStorage.set('passkey-token-expire', new Date(Date.now() + (10 * 60 * 1000)));
        // -- passo alla callback la risposta
        return callback instanceof Function ? await callback(response) : true;
    }
    /**
     * Restituisce la lista delle passkeys dell'utente
     */
    static async list() {
        const res = await API.fetch('/api/passkey/list', {
            method: 'GET',
        });
        if (!res) return null;
        return res;
    }
    /**
     * Rinomina
     */
    static async rename(id, name) {
        const res = await API.fetch(`/api/passkey/rename/${id}`, {
            method: 'POST',
            body: { name },
        });
        if (!res) return false;
        return true;
    }
    /**
     * Elimina una passkey
     * @param {string} id 
     */
    static async delete(id) {
        const res = await API.fetch(`/api/passkey/${id}`, {
            method: 'DELETE',
        });
        if (!res) return false;
        return true;
    }
}

window.PasskeyService = PasskeyService;