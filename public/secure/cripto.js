import { Bytes } from "../utils/bytes.js";

/**
 * Classe statica per operazioni crittografiche usando le Web Crypto API.
 */
export class Cripto {
    /**
     * Utility per la codifica in output
     * @param {Uint8Array} bytes 
     * @param {string} encoding hex, base64, base64url, base32
     * @returns 
     */
    static encoding(bytes, encoding) {
        switch (encoding) {
            case 'hex':
                return Bytes.hex.encode(bytes);
            case 'base64':
                return Bytes.base64.encode(bytes);
            case 'base62':
                return Bytes.base62.encode(bytes);
            case 'base64url':
                return Bytes.base64.encode(bytes, true);
            case 'base32':
                return Bytes.base32.encode(bytes);
            default:
                return bytes;
        }
    }
    /**
     * Genera una serie di byte casuali crittograficamente sicuri.
     * @param {number} size - Numero di byte da generare casualmente.
     * @param {string} [encoding=null] - Formato dell'output (optional: 'hex' o 'base64').
     * @returns {string|Uint8Array} - Byte generati nel formato specificato.
     */
    static random_bytes(size, encoding = null) {
        const bytes = crypto.getRandomValues(new Uint8Array(size));
        // -- se l'encoding è hex o base64, utilizzo la classe Bytes per la conversione
        return this.encoding(bytes, encoding);
    }
    /**
     * Generate a high-entropy random number.
     * A secure replacement for Math.random().
     * @returns {number} A number in the range [0, 1).
     */
    static random_ratio() {
        const random_word = window.crypto.getRandomValues(new Uint32Array(1))[0];
        return random_word / 4294967296; // ~ 2 ** 32
    }

    /**
     * Genera un codice di recupero crittograficamente sicuro
     * @param {number} size 
     * @returns {string}
     */
    static random_alphanumeric_code(size = 20, divisor = '-') {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        let recovery_code = "";
        // ---
        for (let i = 0; i < size; i++) {
            recovery_code += chars[Math.floor(this.random_ratio() * chars.length)];
        }
        // ---
        return divisor ? recovery_code.match(/.{1,4}/g).join(divisor) : recovery_code;
    }

    /**
     * Genera un hash HMAC di un messaggio con una chiave specifica.
     * @param {string | Uint8Array} message - Messaggio da crittografare.
     * @param {Uint8Array} key - Chiave segreta per l'HMAC.
     * @param {Object} [options={}] - Opzioni per configurare l'HMAC.
     * @param {string} [options.key_encoding] - Encoding della chiave (es: 'hex' o 'base64').
     * @param {string} [options.algo='SHA-256'] - Algoritmo di hash da usare per l'HMAC.
     * @param {string} [options.encoding='hex'] - Encoding per l'output HMAC, default 'hex'.
     * @returns {Promise<string|Uint8Array>} - HMAC del messaggio in formato specificato.
     */
    static async hmac(message, key, options = {}) {
        const message_bytes = message instanceof Uint8Array ? message : new TextEncoder().encode(message);
        // ---
        const crypto_key = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: { name: options.algo || 'SHA-256' } },
            false,
            ['sign']
        );
        // -- genero l'HMAC
        const hmac_buffer = await crypto.subtle.sign('HMAC', crypto_key, message_bytes);
        // -- converto l'output nel formato desiderato (hex, base64 o Uint8Array)
        return this.encoding(new Uint8Array(hmac_buffer), options.encoding);
    }

    /**
     * Calcola l'hash di un messaggio.
     * @param {string | Uint8Array} message - Messaggio da hashare.
     * @param {Object} [options={}] - Opzioni per configurare l'hash.
     * @param {string} [options.algorithm='SHA-256'] - Algoritmo di hash da usare (es: 'SHA-256').
     * @param {string} [options.encoding='hex'] - Encoding per l'output hash, default 'hex'.
     * @returns {Promise<string|Uint8Array>} - Hash del messaggio in formato specificato.
     */
    static async hash(message, options = {}) {
        const hashBuffer = await crypto.subtle.digest(
            { name: options.algorithm || 'SHA-256' },
            message instanceof Uint8Array ? message : new TextEncoder().encode(message)
        );
        // -- converto l'output nel formato desiderato (hex, base64 o Uint8Array)
        return this.encoding(new Uint8Array(hashBuffer), options.encoding);
    }

    /**
     * Deriva una chiave crittografica da una password usando PBKDF2.
     * @param {string | Uint8Array} password - La password da usare per derivare la chiave.
     * @param {Uint8Array} salt - Il sale utilizzato nel processo di derivazione.
     * @param {number} [iterations=16] - Il numero di iterazioni da eseguire.
     * @param {number} [key_length=32] - La lunghezza della chiave derivata in byte.
     * @param {string} [algo='SHA-256'] - L'algoritmo di hash da usare per PBKDF2 (default 'SHA-256').
     * @returns {Promise<Uint8Array>} - La chiave derivata.
     */
    static async derive_key(password, salt, iterations = 16, key_length = 32, algo = 'SHA-256') {
        // -- converto la password in un Uint8Array
        const password_buffer = password instanceof Uint8Array ? password : new TextEncoder().encode(password);
        // -- derivo la chiave con PBKDF2
        const derived_key = await crypto.subtle.importKey(
            'raw',
            password_buffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        // -- eseguo la derivazione con PBKDF2
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: { name: algo },
            },
            derived_key,
            { name: 'AES-GCM', length: key_length * 8 }, // AES key length in bits
            true,
            ['encrypt', 'decrypt']
        );
        // -- restituisco la chiave derivata come Uint8Array
        return new Uint8Array(await crypto.subtle.exportKey('raw', key));
    }
    /**
     * Deriva una chiave crittografica da una password usando ARGON2.
     * @param {string | Uint8Array} password - La password da usare per derivare la chiave.
     * @param {Uint8Array} salt - Il sale utilizzato nel processo di derivazione.
     */
    static argon2(password, salt) {
        // -- converto la password in un Uint8Array
        const password_buffer = password instanceof Uint8Array ? password : new TextEncoder().encode(password);
        // ---
        return window.Argon2(password_buffer, salt);
    }

    /**
     * Tronca un UInt8Array
     * @param {Uint8Array} buf 
     * @param {number} length 
     * @param {string} mode "start": keeps the first N bytes, "end": keeps the last N bytes, "middle": keeps the center part, "smart": keeps start and end, drops the middle
     * @returns {Uint8Array}
     */
    static truncateBuffer(buf, length, mode = "start") {
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
     * Genera una coppia di chiavi asimmetriche in formato PEM in base al tipo di chiave e alla lunghezza.
     * Supporta RSA, ECDSA ed ED25519.
     * 
     * @param {string} key_type - Il tipo di chiave da generare. Può essere 'RSA', 'ECDSA', 'ED25519'.
     * @param {number} [key_length=2048] - La lunghezza della chiave, utilizzato solo per RSA (es. 2048, 4096). Ignorato per ECDSA e ED25519.
     * @returns {Promise<Object>} - Oggetto contenente la chiave privata e la chiave pubblica in formato PEM.
     * @throws {Error} - Se il tipo di chiave non è supportato o c'è un errore nella generazione.
     */
    static async generate_key_pair(key_type, key_length = 2048, as_pem = false) {
        let algorithm;
        switch (key_type) {
            case 'RSA':
                // Configurazione RSA
                algorithm = {
                    name: 'RSA-OAEP',
                    modulusLength: key_length, // RSA 2048 o 4096
                    publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
                    hash: { name: 'SHA-256' }
                };
                break;

            case 'ECDSA':
                // Configurazione ECDSA con curva P-256
                algorithm = {
                    name: 'ECDSA',
                    namedCurve: 'P-256', // Può essere cambiato a P-384 o P-521
                };
                break;

            default:
                return -1;
        }
        try {
            // definisco l'utilizzo della chiave
            const usages = key_type === 'RSA' ? ['encrypt', 'decrypt'] : ['sign', 'verify'];
            // Genera la coppia di chiavi
            const key_pair = await crypto.subtle.generateKey(
                algorithm,
                true, // Le chiavi possono essere esportate
                usages, // Le operazioni per RSA, ECDSA e ED25519
            );
            // Estrai la chiave pubblica e privata in formato ArrayBuffer
            const public_key = await crypto.subtle.exportKey('spki', key_pair.publicKey);
            const private_key = await crypto.subtle.exportKey('pkcs8', key_pair.privateKey);
            // Converte le chiavi in formato PEM
            return {
                public: as_pem ? Bytes.pem.encode(public_key, 'PUBLIC KEY') : public_key,
                private: as_pem ? Bytes.pem.encode(private_key, 'PRIVATE KEY') : private_key,
            };
        } catch (error) {
            console.warn('Error generating key pair', error);
            throw new Error('Error generating key pair');
        }
    }
}

window.Cripto = Cripto;