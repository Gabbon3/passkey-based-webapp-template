import { RamDB } from "../utils/ramdb.js";
import { v4 as uuidv4 } from 'uuid';
import { ECDH } from '../lib/ecdh.node.js';
import { Bytes } from "../utils/bytes.util.js";
import { Cripto } from "../utils/cripto.util.js";
import { AES256GCM } from "../utils/aesgcm.js";
import { AuthKeys } from "../models/authKeys.model.js";

/**
 * PULSE = Parallel Unlinkable Long-lived Session Exchange
 */
export class PULSE {
    static timeWindow = 1800; // 30 minuti
    /**
     * Verifica l'header di integrità
     * @param {string} kid key id, un guid v4
     * @param {string} integrity - stringa in base64
     */
    static async verifyIntegrity(kid, integrity) {
        const rawIntegrity = Bytes.base64.decode(integrity);
        const sharedKey = await this.getAuthKey(kid);
        if (!sharedKey) return false;
        // -- provo con la finestra corrente e quelle adiacenti (-1, 0, +1)
        const shifts = [0, -1, 1];
        for (const shift of shifts) {
            const derivedKey = this.deriveKey(sharedKey, PULSE.timeWindow, shift);
            try {
                AES256GCM.decrypt(rawIntegrity, derivedKey);
                return true;
            } catch (err) {
                // continua con il prossimo shift
            }
        }
        return false; // tutte le finestre fallite
    }

    /**
     * Ottiene una auth key, prima prova dalla ram, poi dal db, se no null
     * @param {string} kid 
     * @returns {Uint8Array}
     */
    static async getAuthKey(kid) {
        try {
            // -- RAM
            const fromRam = RamDB.get(kid);
            if (fromRam) return fromRam;
            // -- DB
            const fromDB = await AuthKeys.findByPk(kid);
            if (fromDB) {
                // -- aggiorna last_seen_at
                fromDB.last_seen_at = new Date();
                await fromDB.save();
                // -- salvo in ram
                RamDB.set(kid, fromDB.secret, 3600);
                // ---
                return Bytes.hex.decode(fromDB.secret);
            }
            // ---
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Salva sul db la il segreto condiviso
     * @param {string} kid 
     * @param {string} sharedKey 
     * @returns 
     */
    static async saveAuthKey(kid, sharedKey) {
        const authKey = new AuthKeys({
            kid: kid,
            secret: Bytes.hex.encode(sharedKey),
        });
        return await authKey.save();
    }

    /**
     * Deriva la chiave sfruttando le finestre temporali
     * @param {Uint8Array} sharedKey 
     * @param {number} [interval=60] intervallo di tempo in secondi, di default a 1 ora
     * @param {number} [shift=0] con 0 si intende l'intervallo corrente, con 1 il prossimo intervallo, con -1 il precedente
     */
    static deriveKey(sharedKey, interval = PULSE.timeWindow, shift = 0) {
        const windowIndex = Math.floor(((Date.now() / 1000) + (shift * interval)) / interval);
        return Cripto.hmac(`${windowIndex}`, sharedKey);
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
        // -- formalizzo
        const formatted = Cripto.hash(sharedSecret);
        // -- salvo in Ram
        RamDB.set(kid, formatted, 3600);
        // ---
        return { kid, keyPair, sharedKey: formatted };
    }
}