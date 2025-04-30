import { SecureLayer } from "../secure/secureLayer.js";
import { API } from "../utils/api.js";

export class AuthService {
    /**
     * Registra un utente
     * @param {string} email
     * @param {string} request_id id richiesta del 
     * @param {string} code codice otp
     * @returns {boolean}
     */
    static async signup(email, request_id, code) {
        // -- invio la richiesta
        const res = await API.fetch('/api/auths/signup', {
            method: 'POST',
            body: {
                request_id,
                code,
                email,
            },
        });
        // -- verifico la risposta
        if (!res) return false;
        // ---
        return true;
    }
    /**
     * 
     * @param {string} email
     * @param {string} request_id id richiesta del 
     * @param {string} code codice otp
     * @returns {boolean}
     */
    static async signin(email, request_id, code) {
        // -- genero la coppia di chiavi
        await SecureLayer.generateKeyPair();
        // -- invio la richiesta
        const res = await API.fetch('/api/auths/signin-e', {
            method: 'POST',
            body: {
                request_id,
                code,
                email,
                publicKey: SecureLayer.clientPublicKeyHex
            },
        });
        // -- verifico la risposta
        if (!res) return false;
        // ---
        const { accessToken, publicKey: serverPublicKey } = res;
        // ---
        const completed = await SecureLayer.completeHandshake(serverPublicKey);
        return completed;
    }
}

window.AuthService = AuthService;