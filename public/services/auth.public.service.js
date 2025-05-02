import { PULSE } from "../secure/PULSE.js";
import { API } from "../utils/api.js";
import { LocalStorage } from "../utils/local.js";

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
        const res = await API.fetch('/api/auth/signup', {
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
        await PULSE.generateKeyPair();
        // -- invio la richiesta
        const res = await API.fetch('/api/auth/signin-e', {
            method: 'POST',
            body: {
                request_id,
                code,
                email,
                publicKey: PULSE.clientPublicKeyHex
            },
        });
        // -- verifico la risposta
        if (!res) return false;
        // ---
        const { accessToken, publicKey: serverPublicKey } = res;
        // ---
        const completed = await PULSE.completeHandshake(serverPublicKey);
        return completed;
    }
    /**
     * Effettua il logout
     */
    static async signout() {
        const res = await API.fetch('/api/auth/signout', {
            method: 'POST',
        });
        if (!res) return false;
        // ---
        LocalStorage.remove('shared-secret');
        return true;
    }
}

window.AuthService = AuthService;