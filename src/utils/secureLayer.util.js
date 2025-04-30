import { RamDB } from "../utils/ramdb.js";
import { v4 as uuidv4 } from 'uuid';
import { ECDH } from '../lib/ecdh.node.js';
import { Bytes } from "./bytes.util.js";
import { Cripto } from "./cripto.util.js";
import { AES256GCM } from "./aesgcm.js";

export class SecureLayer {
    /**
     * Verifica l'header di integrità
     * @param {string} kid key id, un guid v4
     * @param {string} integrity - stringa in esadecimale
     */
    static verifyIntegrity(kid, integrity) {
        const rawIntegrity = Bytes.hex.decode(integrity);
        // TODO: quando funzionerà senza rotazione, allora sarà da implementare correttamente
        const newKey = this.updateKey(kid);
        try {
            AES256GCM.decrypt(rawIntegrity, newKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Calcola il counter basandosi sulla chiave
     * @param {Uint8Array} key chiave simmetrica condivisa con i client
     * @returns {number}
     */
    static calculateCounter(key) {
        return key[0] ^ key[17] ^ key[31];
    }

    /**
     * Restituisce la nuova chiave mescolando il counter
     * @param {string} kid key id, un guid v4
     * @returns {Uint8Array}
     */
    static updateKey(kid) {
        let [key, counter] = RamDB.get(kid);
        counter++;
        const counterBytes = Bytes.bigint.decode(BigInt(counter));
        const newKey = Cripto.hash(Bytes.merge([key, counterBytes], 8));
        // -- salvo il nuovo counter e la nuova chiave
        RamDB.update(kid, [newKey, counter]);
        // ---
        return newKey;
    }

    /**
     * Calcola il segreto condiviso con il client e lo memorizza in ram per un ora
     * @param {string} publicKeyHex chiave pubblica del client in formato esadecimale
     */
    static async calculateSharedSecret(publicKeyHex) {
        // -- genero un guid per la chiave ecdh
        const kid = uuidv4(); // kid = key id
        // -- genero la coppia e derivo il segreto
        const clientPublicKey = Buffer.from(publicKeyHex, "hex");
        const keyPair = ECDH.generateKeys();
        const sharedSecret = ECDH.deriveSharedSecret(
            keyPair.private_key,
            clientPublicKey
        );
        // -- calcolo il counter
        const counter = this.calculateCounter(sharedSecret);
        // -- salvo in Ram
        RamDB.set(kid, [sharedSecret, counter], 3600);
        // ---
        return { kid, keyPair };
    }
}