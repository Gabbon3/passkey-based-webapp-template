import crypto from "crypto";

export class Cripto {
    /**
     * Genera una serie di byte casuali crittograficamente sicuri
     * @param {number} size numero di byte da generare casualmente del
     * @param {string} [encoding] - Formato della chiave Uint8Array di default se no: 'hex', 'base64'
     * @returns {string} byte generati
     */
    randomBytes(size, encoding = null) {
        const bytes = crypto.randomBytes(size);
        return encoding ? bytes.toString(encoding) : new Uint8Array(bytes);
    }
    /**
     * Genera un bypass token, sul ram db è identificato come byp-{il token}
     * @param {number} [randomSize=32]
     * @returns {string} in esadecimale
     */
    bypassToken(randomSize = 32) {
        return this.randomBytes(randomSize, "hex");
    }
    /**
     * Generate a high-entropy random number.
     * A secure replacement for Math.random().
     * @returns {number} A number in the range [0, 1).
     */
    randomRatio() {
        const random_word = crypto.randomInt(0, 4294967296); // Generates a random integer from 0 to 2^32
        return random_word / 4294967296; // ~ 2 ** 32
    }
    /**
     * Genera un codice casuale a 6 cifre
     */
    randomOTPCode() {
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += "1234567890"[Math.floor(this.randomRatio() * 10)];
        }
        return code;
    }
    /**
     * Genera un hash HMAC di un messaggio con una chiave specifica.
     * @param {string|crypto.BinaryLike} message - Messaggio da crittografare.
     * @param {Buffer|string} key - Chiave segreta per l'HMAC; può essere una stringa o un buffer.
     * @param {Object} [options={}] - Opzioni per configurare l'HMAC.
     * @param {string} [options.key_encoding] - Encoding della chiave, se fornita come stringa (es: 'hex' o 'base64'). Se non specificato, si assume che `key` sia già un `Buffer`.
     * @param {string} [options.algo='sha256'] - Algoritmo di hash da usare per l'HMAC (es: 'sha256').
     * @param {string} [options.output_encoding='hex'] - Encoding per l'output HMAC, default 'hex'.
     * @returns {*} HMAC del messaggio in formato specificato.
     */
    async hmac(message, key, options = {}) {
        const key_buffer = options.key_encoding
            ? Buffer.from(key, options.key_encoding)
            : Buffer.from(key);
        // ---
        const hmac_buffer = await new Promise((resolve, reject) => {
            try {
                const result = crypto
                    .createHmac(options.algo ?? "sha256", key_buffer)
                    .update(message)
                    .digest();
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
        // ---
        return options.output_encoding
            ? hmac_buffer.toString(options.output_encoding)
            : new Uint8Array(hmac_buffer);
    }

    /**
     * Funzione di derivazione HKDF
     * @param {BinaryLike} ikm - input key material
     * @param {BinaryLike} salt -
     * @param {BinaryLike} additionalInfo - informazioni aggiuntive, non piu di 1024 bytes
     * @param {*} keyLen
     * @returns {ArrayBuffer}
     */
    async HKDF(ikm, salt, additionalInfo = null, keyLen = 32) {
        return await new Promise((resolve, reject) => {
            crypto.hkdf(
                "sha256",
                ikm,
                salt,
                additionalInfo ?? new Uint8Array([0]),
                keyLen,
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });
    }

    /**
     * Esegue hash con salt usando hmac
     * @param {string|crypto.BinaryLike} message
     * @param {*} key
     * @param {*} options
     */
    hashWithSalt(message) {
        const salt = crypto.randomBytes(16);
        const hash = Buffer.from(this.hmac(message, salt));
        return new Uint8Array(Buffer.concat([salt, hash]));
    }
    /**
     * Verifica un salting
     * @param {string|crypto.BinaryLike} message
     * @param {Uint8Array} salt_hash
     * @returns {boolean}
     */
    verifyHashWithSalt(message, salt_hash) {
        const salt = salt_hash.subarray(0, 16);
        const hash = salt_hash.subarray(16);
        // ---
        const new_hash = this.hmac(message, salt);
        return Buffer.compare(hash, new_hash) === 0;
    }
    /**
     * Tronca un UInt8Array
     * @param {Uint8Array} buf
     * @param {number} length
     * @param {string} mode "start": keeps the first N bytes, "end": keeps the last N bytes, "middle": keeps the center part, "smart": keeps start and end, drops the middle
     * @returns {Uint8Array}
     */
    truncateBuffer(buf, length, mode = "start") {
        if (!(buf instanceof Uint8Array)) {
            throw new TypeError("Expected a Uint8Array");
        }

        if (length >= buf.length) return buf;

        switch (mode) {
            case "start":
                return buf.slice(0, length);
            case "end":
                return buf.slice(buf.length - length);
            case "middle": {
                const start = Math.floor((buf.length - length) / 2);
                return buf.slice(start, start + length);
            }
            case "smart": {
                const half = Math.floor(length / 2);
                const startPart = buf.slice(0, half);
                const endPart = buf.slice(buf.length - (length - half));
                const combined = new Uint8Array(length);
                combined.set(startPart);
                combined.set(endPart, half);
                return combined;
            }
            default:
                throw new Error(`Unknown truncation mode: ${mode}`);
        }
    }
    
    /**
     * Calcola l'hash di un messaggio.
     * @param {string} message - Messaggio da hashare.
     * @param {Object} [options={}] - Opzioni per configurare l'hash.
     * @param {string} [options.algorithm='sha256'] - Algoritmo di hash da usare (es: 'sha256').
     * @param {string} [options.encoding='hex'] - Encoding per l'output hash, default 'hex'.
     * @returns {string|Uint8Array} Hash del messaggio in formato specificato.
     */
    async hash(message, options = {}) {
        const hash_buffer = await new Promise((resolve, reject) => {
            try {
                const result = crypto
                    .createHash(options.algorithm ?? "sha256")
                    .update(message)
                    .digest();
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
        // ---
        return options.encoding
            ? hash_buffer.toString(options.encoding)
            : new Uint8Array(hash_buffer);
    }
}
