import { RamDB } from "../utils/ramdb.js";
import { v4 as uuidv4 } from 'uuid';
import { ECDH } from '../lib/ecdh.node.js';
import { Bytes } from "../utils/bytes.util.js";
import { Cripto } from "../utils/cripto.util.js";
import { AES256GCM } from "../utils/aesgcm.js";
import { AuthKeys } from "../models/authKeys.model.js";
import { Config } from "../serverConfig.js";
import { JWT } from "../utils/jwt.util.js";

/**
 * PULSE = Persistent User Login with Symmetric Encryption
 */
export class PULSE {
    static timeWindow = 120; // in secondi
    static jwtLifetime = 31 * 24 * 60 * 60; // in secondi

    /**
     * Avvia una sessione pulse, quindi calcola il segreto condiviso e lo salva sul db, genera il jwt
     * @param {Object} [options={}] * opzioni di configurazione della sessione
     * @param {string} [options.publicKeyHex] * chiave pubblica del client in formato esadecimale
     * @param {string} [options.userId] * id dell'utente
     * @param {Object} [options.payload] * il payload del jwt
     * @param {number} [options.jwtLifetime=PULSE.jwtLifetime] - tempo di vita del jwt in secondi
     */
    async generateSession({ publicKeyHex, userId, payload, jwtLifetime = PULSE.jwtLifetime } = {}) {
        /**
         * Calcolo il segreto condiviso
         */
        const { kid, keyPair, sharedSecret } = await this.calculateSharedSecret(publicKeyHex);
        /**
         * Salvo sul db il segreto condiviso
         */
        await this.saveSharedSecret(kid, sharedSecret, userId);
        /**
         * Genero il JWT
         */
        const jwtSignKey = await this.calculateJWTSignKey(sharedSecret);
        if (!jwtSignKey) return false;
        const jwt = JWT.create({ ...payload, kid }, jwtLifetime, jwtSignKey);
        // ---
        return {
            jwt: jwt,
            publicKey: keyPair.public_key.toString('hex')
        }
    }

    /**
     * Verifica l'header di integrità
     * @param {string} guid uuid della auth key, un uuid v4
     * @param {string} integrity - stringa in base64
     * @returns {number | boolean} false -> integrita non valida, -1 segreto non trovato
     */
    async verifyIntegrity(guid, integrity) {
        const rawIntegrity = Bytes.base64.decode(integrity, true);
        // -- ottengo salt e lo separo dalla parte cifrata
        const salt = rawIntegrity.subarray(0, 12);
        const encrypted = rawIntegrity.subarray(12);
        // ---
        const sharedKey = await this.getSharedSecret(guid);
        if (!sharedKey) return -1;
        // -- provo con la finestra corrente e quelle adiacenti (-1, 0, +1)
        const shifts = [0, -1, 1];
        for (const shift of shifts) {
            const derivedKey = this.deriveKey(sharedKey, salt, PULSE.timeWindow, shift);
            try {
                AES256GCM.decrypt(encrypted, derivedKey);
                return true;
            } catch (err) {
                // continua con il prossimo shift
            }
        }
        return false; // tutte le finestre fallite
    }

    /**
     * Ottiene una auth key, prima prova dalla ram, poi dal db, se no null
     * @param {string} guid 
     * @returns {Uint8Array}
     */
    async getSharedSecret(guid) {
        try {
            const kid = await this.calculateKid(guid);
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
                const decodedKey = Bytes.hex.decode(fromDB.secret);
                RamDB.set(kid, decodedKey, 3600);
                // ---
                return decodedKey;
            }
            // ---
            return null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * Restituisce la chiave di firma del jwt
     * @param {string} jwt 
     * @returns {Uint8Array | boolean}
     */
    async getJWTSignKey(jwt) {
        // -- ottengo il kid
        let kid = null;
        try {
            kid = JSON.parse(atob(jwt.split('.')[1])).kid;
        } catch (error) {
            console.warn(error);
            return false;
        }
        // ---
        const sharedKey = await this.getSharedSecret(kid);
        if (!sharedKey) return false;
        // ---
        return await this.calculateJWTSignKey(sharedKey);
    }

    /**
     * Restituisce la chiave di firma del jwt
     * @param {Uint8Array} sharedKey 
     * @returns {Uint8Array}
     */
    async calculateJWTSignKey(sharedKey) {
        return await Cripto.hmac(sharedKey, Config.PULSEPEPPER)
    }

    /**
     * Restituisce l'hash pepato del guid della auth key
     * @param {string} guid 
     * @returns {string}
     */
    async calculateKid(guid) {
        return await Cripto.hmac(guid, Config.PULSEPEPPER, { output_encoding: 'hex' });
    }

    /**
     * Salva sul db la il segreto condiviso
     * @param {string} guid 
     * @param {string} sharedKey 
     * @param {string} uid user id
     * @returns 
     */
    async saveSharedSecret(guid, sharedKey, uid) {
        const kid = await this.calculateKid(guid);
        // ---
        const authKey = new AuthKeys({
            kid: kid,
            secret: Bytes.hex.encode(sharedKey),
            user_id: uid,
        });
        return await authKey.save();
    }

    /**
     * Deriva la chiave sfruttando le finestre temporali
     * @param {Uint8Array} sharedKey 
     * @param {Uint8Array} salt - il salt incluso nella richiesta
     * @param {number} [interval=60] intervallo di tempo in secondi, di default a 1 ora
     * @param {number} [shift=0] con 0 si intende l'intervallo corrente, con 1 il prossimo intervallo, con -1 il precedente
     */
    deriveKey(sharedKey, salt, interval = PULSE.timeWindow, shift = 0) {
        const int = Math.floor(((Date.now() / 1000) + (shift * interval)) / interval);
        const windowIndex = new TextEncoder().encode(`${int}`);
        // ---
        return Cripto.HKDF(sharedKey, salt, windowIndex);
    }

    /**
     * Calcola il segreto condiviso con il client e lo memorizza in ram per un ora
     * @param {string} publicKeyHex chiave pubblica del client in formato esadecimale
     */
    async calculateSharedSecret(publicKeyHex) {
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
        RamDB.set(kid, formatted, PULSE.ramTimeout);
        // ---
        return { kid, keyPair, sharedSecret: formatted };
    }
}