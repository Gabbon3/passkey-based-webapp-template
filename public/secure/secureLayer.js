import { Cripto } from "./cripto.js";
import { AES256GCM } from "./aesgcm.js";
import { SessionStorage } from "../utils/session.js";
import { Bytes } from "../utils/bytes.js";
import { ECDH } from "./ecdh.js";

export class SecureLayer {
    // usato per memorizzare la vecchia chiave
    static recentKey = null;
    // ---
    static clientPrivateKey = null;
    static clientPublicKey = null;
    static clientPublicKeyHex = null;
    // -- chiave derivata dall'handshake con il server
    static key = null;
    static counter = 0n;
    /**
     * Restituisce la stringa di integrità 
     * da associare alle fetch come header
     * @returns {string} stringa esadecimale dell'integrità
     */
    static getIntegrity() {
        // -- ottengo la chiave dal session storage
        const key = SessionStorage.get('key');
        const counter = SessionStorage.get('counter');
        // ---
        if (!key || !counter) return null;
        // -- ottengo la chiave nuova
        const newKey = this.updateKey(key, counter);
        // -- genero la challenge
        const challenge = Cripto.random_bytes(12);
        const encrypted = AES256GCM.encrypt(challenge, newKey);
        return Bytes.hex.encode(encrypted);
    }
    /**
     * Restituisce la nuova chiave mescolando il counter
     * @param {Uint8Array} key 
     * @param {BigInt} counter 
     * @returns {Uint8Array}
     */
    static updateKey(key, counter) {
        this.recentKey = key;
        // ---
        counter++;
        const counterBytes = Bytes.bigint.decode(counter);
        const newKey = Cripto.hash(Bytes.merge([key, counterBytes], 8));
        // -- salvo il nuovo counter e la nuova chiave
        SessionStorage.set('key', newKey);
        SessionStorage.set('counter', counter);
        // ---
        return newKey;
    }
    /**
     * Genera e imposta le chiavi da usare per l'handshake con il server
     * @returns {boolean}
     */
    static async generateKeyPair() {
        const keyPair = await ECDH.generate_keys();
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
        this.key = await ECDH.deriveSharedSecret(
            this.clientPrivateKey,
            serverPublicKey
        );
        return true;
    }
    /**
     * Calcola il counter basandosi sulla chiave
     * @param {Uint8Array} [key=this.key] 
     * @returns {BigInt}
     */
    static calculateCounter(key = this.key) {
        return BigInt(key[0] ^ key[17] ^ key[31]);
    }

    /**
     * Completa l'handshake calcolando tutto il necessario in locale
     * @param {string} serverPublicKeyHex 
     * @returns {boolean}
     */
    static async completeHandshake(serverPublicKeyHex) {
        // -- derivo il segreto condiviso
        await this.deriveSharedSecret(serverPublicKeyHex);
        if (!this.key) return false;
        // -- calcolo il contatore
        this.counter = this.calculateCounter();
        // -- setto localmente
        SessionStorage.set('key', this.key);
        SessionStorage.set('counter', this.counter);
        // ---
        return true;
    }
}