import { Cripto } from "./cripto.js";
import { AES256GCM } from "./aesgcm.js";
import { Bytes } from "../utils/bytes.js";
import { ECDH } from "./ecdh.js";
import { LocalStorage } from "../utils/local.js";

/**
 * PULSE = Parallel Unlinkable Long-lived Session Exchange
 */
export class PULSE {
    // usato per memorizzare la vecchia chiave
    static recentKey = null;
    // ---
    static clientPrivateKey = null;
    static clientPublicKey = null;
    static clientPublicKeyHex = null;
    /**
     * Segreto derivata dall'handshake con il server
     */
    static sharedSecret = null;
    /**
     * Restituisce la stringa di integrità 
     * da associare alle fetch come header
     * @returns {string} stringa esadecimale dell'integrità
     */
    static async getIntegrity() {
        // -- ottengo la chiave dal session storage
        const sharedSecret = await LocalStorage.get('shared_secret');
        // ---
        if (sharedSecret instanceof Uint8Array == false) return null;
        // -- ottengo la chiave nuova
        const derivedKey = await this.deriveKey(sharedSecret);
        // -- genero la challenge
        const challenge = Cripto.random_bytes(12);
        const encrypted = await AES256GCM.encrypt(challenge, derivedKey);
        return Bytes.base64.encode(encrypted);
    }
    /**
     * Genera e imposta le chiavi da usare per l'handshake con il server
     * @returns {boolean}
     */
    static async generateKeyPair() {
        const keyPair = await ECDH.generateKeys();
        // ---
        this.clientPrivateKey = keyPair.private_key[0];
        // -
        this.clientPublicKey = keyPair.public_key[0];
        this.clientPublicKeyHex = Bytes.hex.encode(keyPair.public_key[1]);
        // ---
        return true;
    }

    /**
     * Deriva il segreto condiviso con il server
     * @param {string} serverPublicKeyHex in esadecimale
     */
    static async deriveSharedSecret(serverPublicKeyHex) {
        const serverPublicKey = await ECDH.importPublicKey(
            Bytes.hex.decode(serverPublicKeyHex)
        );
        // ---
        const sharedSecret = await ECDH.deriveSharedSecret(
            this.clientPrivateKey,
            serverPublicKey
        );
        // -- formalizzo
        this.sharedSecret = await Cripto.hash(sharedSecret);
        // --
        return true;
    }

    /**
     * Deriva la chiave sfruttando le finestre temporali
     * @param {Uint8Array} sharedKey 
     * @param {number} [interval=60] intervallo di tempo in secondi, di default a 1 ora
     * @param {number} [shift=0] con 0 si intende l'intervallo corrente, con 1 il prossimo intervallo, con -1 il precedente
     */
    static async deriveKey(sharedKey, interval = 3600, shift = 0) {
        const windowIndex = Math.floor(((Date.now() / 1000) + (shift * interval)) / interval);
        return await Cripto.hmac(`${windowIndex}`, sharedKey);
    }

    /**
     * Completa l'handshake calcolando tutto il necessario in locale
     * @param {string} serverPublicKeyHex 
     * @returns {boolean}
     */
    static async completeHandshake(serverPublicKeyHex) {
        // -- derivo il segreto condiviso
        await this.deriveSharedSecret(serverPublicKeyHex);
        if (!this.sharedSecret) return false;
        // -- setto localmente
        LocalStorage.set('shared_secret', this.sharedSecret);
        // ---
        return true;
    }
}