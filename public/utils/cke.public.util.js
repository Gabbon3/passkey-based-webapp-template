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
        await LocalStorage.set("cke-localMaterial", localMaterial);
        // -- derivo il segreto
        const key = await this.deriveKey(rawCookieMaterial, localMaterial);
        // -- memorizzo in sessione
        SessionStorage.set("cke-key", key);
        return key;
    }

    /**
     * Imposta una nuova chiave CKS
     * @param {string} bypassToken - non obbligatoria, ma se viene passata, bypassa il controllo con la passkey
     */
    static async set(bypassToken = null) {
        const res = await PasskeyService.authenticate({ endpoint: "/cke/set", body: { bypassToken } });
        // ---
        const { basic, advanced } = res.new;
        // -- decodifico il materiale
        const basicBytes = Bytes.hex.decode(basic);
        const advancedBytes = Bytes.hex.decode(advanced);
        // -- genero il materiale locale
        const localMaterial = Cripto.random_bytes(32);
        LocalStorage.set("cke-localMaterial", localMaterial);
        // ---
        const keyBasic = await this.deriveKey(basicBytes, localMaterial);
        const keyAdvanced = await this.deriveKey(advancedBytes, localMaterial);
        SessionStorage.set("cke-key-basic", keyBasic);
        SessionStorage.set("cke-key-advanced", keyAdvanced);
        return { keyBasic, keyAdvanced };
    }

    /**
     * Ottiene il materiale cookie e configura localmente la chiave
     * @returns {null | Uint8Array}
     */
    static async getBasic() {
        const localMaterial = await LocalStorage.get("cke-localMaterial");
        if (!localMaterial) {
            console.warn("No local material founded");
            return null;
        }
        // ---
        const res = await API.fetch("/cke/get/basic", {
            method: "GET",
        });
        if (!res) return null;
        // -- decodifico il materiale
        const cookieMaterial = Bytes.hex.decode(res.material);
        // ---
        const key = await this.deriveKey(cookieMaterial, localMaterial);
        SessionStorage.set("cke-key-basic", key);
        return key;
    }

    /**
     * Restituisce la chiave avanzata
     * @returns {Uint8Array}
     */
    static async getAdvanced() {
        const localMaterial = await LocalStorage.get("cke-localMaterial");
        if (!localMaterial) {
            console.warn("No local material founded");
            return null;
        }
        // ---
        const res = await PasskeyService.authenticate({
            endpoint: "/cke/get/advanced",
        });
        if (!res) return null;
        // -- decodifico il materiale
        const cookieKey = Bytes.hex.decode(res.key);
        // ---
        const key = await this.deriveKey(cookieKey, localMaterial);
        SessionStorage.set("cke-key-advanced", key);
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