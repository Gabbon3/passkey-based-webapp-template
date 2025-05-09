import { Cripto } from "../secure/cripto.js";
import { API } from "./api.js";
import { Bytes } from "./bytes.js";
import { LocalStorage } from "./local.js";
import { SessionStorage } from "./session.js";

export class CKE {
    /**
     * Inizializza localmente CKE, generando materiale locale e derivando la chiave
     * @param {string} cookieMaterialHex 
     * @returns {Uint8Array} la chiave derivata
     */
    static async init(cookieMaterialHex) {
        const rawCookieMaterial = Bytes.hex.decode(cookieMaterialHex);
        // -- genero il materiale locale e lo memorizzo
        const localMaterial = await Cripto.random_bytes(32);
        await LocalStorage.set('cke-localMaterial', localMaterial);
        // -- derivo il segreto
        const key = await this.deriveKey(rawCookieMaterial, localMaterial);
        // -- memorizzo in sessione
        SessionStorage.set('cke-key', key);
        return key;
    }

    /**
     * Imposta una nuova chiave CKS
     */
    static async set() {
        const res = await API.fetch('/api/cke/', {
            method: 'POST',
        });
        if (!res) return null;
        // -- decodifico il materiale
        const cookieMaterial = Bytes.hex.decode(res.material);
        // -- genero il materiale locale
        const localMaterial = Cripto.random_bytes(32);
        LocalStorage.set('cke-localMaterial', localMaterial);
        // ---
        const key = await this.deriveKey(cookieMaterial, localMaterial);
        SessionStorage.set('cke-key', key);
        return key;
    }

    /**
     * Ottiene il materiale cookie e configura localmente la chiave
     * @returns {null | Uint8Array}
     */
    static async get() {
        const res = await API.fetch('/api/cke/', {
            method: 'GET',
        });
        if (!res) return null;
        // ---
        const localMaterial = await LocalStorage.get('cke-localMaterial');
        if (!localMaterial) {
            console.warn('No local material founded');
            return null;
        }
        // -- decodifico il materiale
        const cookieMaterial = Bytes.hex.decode(res.material);
        // ---
        const key = await this.deriveKey(cookieMaterial, localMaterial);
        SessionStorage.set('cke-key', key);
        return key;
    }

    /**
     * Deriva la chiave usando HKDF
     * @param {Uint8Array} cookieMaterial 
     * @param {Uint8Array} localMaterial 
     * @returns 
     */
    static async deriveKey(cookieMaterial, localMaterial) {
        return Cripto.HKDF(cookieMaterial, localMaterial);
    }
}