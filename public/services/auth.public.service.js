import { PULSE } from "../secure/PULSE.browser.js";
import { API } from "../utils/api.js";
import { CKE } from "../utils/cke.public.util.js";
import { LocalStorage } from "../utils/local.js";
import { SessionStorage } from "../utils/session.js";

document.addEventListener('DOMContentLoaded', async () => {
    await AuthService.init();
});

export class AuthService {
    /**
     * Inizializza la sessione calcolando la shared key
     */
    static async init() {
        /**
         * CKE
         */
        const sessionSharedSecret = SessionStorage.get('shared-secret');
        const userIsLogged = LocalStorage.exist('shared-secret');
        if (sessionSharedSecret || !userIsLogged) return true;
        // ---
        const ckeKey = await CKE.get();
        if (!ckeKey) return false;
        // ---
        const sharedSecret = await LocalStorage.get('shared-secret', ckeKey);
        if (!sharedSecret) return false;
        // ---
        SessionStorage.set('shared-secret', sharedSecret);
        return true;
    }
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
     * @returns {boolean | Uint8Array} se tutto ok restituisce il segreto condiviso
     */
    static async signin(email, request_id, code) {
        // -- genero la coppia di chiavi
        const publicKeyHex = await PULSE.generateKeyPair();
        // -- invio la richiesta
        const res = await API.fetch('/api/auth/signin-e', {
            method: 'POST',
            body: {
                request_id,
                code,
                email,
                publicKey: publicKeyHex
            },
        });
        // -- verifico la risposta
        if (!res) return false;
        // ---
        const { publicKey: serverPublicKey } = res;
        // -- ottengo il segreto condiviso e lo cifro in localstorage con CKE
        const sharedSecret = await PULSE.completeHandshake(serverPublicKey);
        if (!sharedSecret) return false;
        SessionStorage.set('shared-secret', sharedSecret);
        /**
         * Inizializzo CKE localmente
         */
        const ckeKey = await CKE.set();
        if (!ckeKey) return false;
        // -- cifro localmente lo shared secret con CKE
        LocalStorage.set('shared-secret', sharedSecret, ckeKey);
        /**
         * Memorizzo altre informzioni
         */
        LocalStorage.set('user-email', email);
        // ---
        return sharedSecret;
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
        localStorage.clear();
        sessionStorage.clear();
        return true;
    }
}

window.AuthService = AuthService;