import msgpack from "msgpack-lite";
import { redis } from "./redis.js";

export class RedisDB {
    /**
     * Salva un nuovo record
     * @param {string} key
     * @param {*} value
     * @param {number} ttl
     * @returns {boolean}
     */
    static async set(key, value, ttl = 3600) {
        try {
            const buffer = msgpack.encode(value);
            await redis.set(key, buffer, "EX", ttl);
            return true;
        } catch (err) {
            console.warn("RedisDB.set error:", err);
            return false;
        }
    }
    /**
     * Verifica se un record esiste
     * @param {string} key
     * @returns {boolean}
     */
    static async has(key) {
        try {
            const exists = await redis.exists(key);
            return exists === 1;
        } catch (err) {
            console.warn("RedisDB.has error:", err);
            return false;
        }
    }
    /**
     * Restituisce un record e se richiesto anche il ttl in secondi rimanente
     * @param {string} key
     * @param {boolean} [getTtl=false] - true per restituire anche il ttl
     * @returns {* | { value: *, ttl: number }}
     */
    static async get(key, getTtl = false) {
        try {
            const buffer = await redis.getBuffer(key);
            if (!buffer) return null;
            const decoded = msgpack.decode(buffer);
            // -- se richiesto restituisco anche il ttl
            if (getTtl) {
                const ttl = await redis.ttl(key);
                return { value: decoded, ttl };
            }
            // ---
            return decoded;
        } catch (err) {
            console.warn("RedisDB.get error:", err);
            return null;
        }
    }
    /**
     * Restituisce ed elimina subito il record
     * @param {string} key
     * @returns {*}
     */
    static async getdel(key) {
        try {
            const buffer = await redis.callBuffer("GETDEL", key);
            if (!buffer) return null;
            return msgpack.decode(Buffer.from(buffer));
        } catch (err) {
            console.warn("RedisDB.getdel error:", err);
            return null;
        }
    }
    /**
     * Aggiorna un record
     * @param {string} key
     * @param {*} newValue
     * @param {number|null} [newTtl=null] - se null, verrà tenuto il ttl precedente, se no verrà sovrascritto
     * @returns {boolean}
     */
    static async update(key, newValue, newTtl = null) {
        try {
            let ttl = newTtl;
            // -- se non viene passato un TTL nuovo, mantengo quello attuale
            if (ttl === null) {
                const t = await redis.ttl(key);
                if (t > 0) ttl = t;
                else if (t === -1) ttl = 0; // chiave permanente
                else if (t === -2) return false; // chiave non esiste
            }
            // ---
            return await RedisDB.set(key, newValue, ttl);
        } catch (err) {
            console.warn("RedisDB.update error:", err);
            return false;
        }
    }
    /**
     * Elimina un record
     * @param {string} key
     * @returns {boolean}
     */
    static async delete(key) {
        try {
            await redis.del(key);
            return true;
        } catch (err) {
            console.warn("RedisDB.delete error:", err);
            return false;
        }
    }
}
