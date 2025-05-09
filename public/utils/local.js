import { AES256GCM } from "../secure/aesgcm.js";
import { Bytes } from "./bytes.js";
import msgpack from "./msgpack.min.js";

export class LocalStorage {
    static prefix = 'gg';
    static key = null;
    /**
     * Salva qualcosa sul localstorage
     * @param {string} key nome di riferimento della risorsa nel local storage
     * @param {string} value 
     * @param {Uint8Array} crypto_key se un Uint8Array verrà eseguita la crittografia del value 
     */
    static async set(key, value, crypto_key = null) {
        if (crypto_key === 1) crypto_key = this.key;
        const buffer = msgpack.encode(value);
        // ---
        const data = crypto_key instanceof Uint8Array ? await AES256GCM.encrypt(buffer, crypto_key) : buffer;
        // ---
        localStorage.setItem(`${LocalStorage.prefix}-${key}`, Bytes.base64.encode(data));
    }
    /**
     * Verifica se un elemento esiste nel localstorage
     * @param {string} key 
     * @returns {boolean} true se esiste false se non esiste
     */
    static exist(key) {
        return localStorage.getItem(`${LocalStorage.prefix}-${key}`) !== null;
    }
    /**
     * Ricava qualcosa dal localstorage
     * @param {string} key nome di riferimento della risorsa nel local storage
     * @param {Uint8Array} crypto_key se diverso da null verrà eseguita la decifratura del value
     * @returns {Promise<string|Object>}
     */
    static async get(key, crypto_key = null) {
        if (crypto_key === 1) crypto_key = this.key;
        try {
            const data = localStorage.getItem(`${LocalStorage.prefix}-${key}`);
            if (!data) return null;
            // ---
            const buffer = Bytes.base64.decode(data);
            let value = crypto_key instanceof Uint8Array ? await AES256GCM.decrypt(buffer, crypto_key) : buffer;
            return msgpack.decode(value);
        } catch (error) {
            console.warn('[!] LocalStorage - get', error);
            return null;
        }
    }
    /**
     * Restituisce vero se un elemento esiste nel localstorage
     * @param {string} key 
     * @returns {boolean}
     */
    static has(key) {
        return localStorage.getItem(`${LocalStorage.prefix}-${key}`) !== null;
    }
    /**
     * Rimuover dal localstorage un elemento
     * @param {string} key 
     */
    static remove(key) {
        localStorage.removeItem(`${LocalStorage.prefix}-${key}`);
    }
}

window.LocalStorage = LocalStorage;