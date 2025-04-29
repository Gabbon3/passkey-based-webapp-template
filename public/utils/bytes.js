import { BaseConverter } from "./baseConverter.js";

export class Bytes {
    static base64 = {
        /**
         * Converte una stringa base64 in un Uint8Array
         * @param {string} base64
         * @returns {Uint8Array}
         */
        decode(base64, urlsafe = false) {
            if (urlsafe) {
                // -- ripristino i caratteri non sicuri per Base64 standard
                base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
                // -- aggiungo padding se necessario
                base64 = base64.padEnd(
                    base64.length + ((4 - (base64.length % 4)) % 4),
                    "="
                );
            }
            const binaryString = atob(base64);
            return Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
        },
        /**
         * Converte un Uint8Array in una stringa base64
         * @param {Uint8Array} buffer
         * @returns {string}
         */
        encode(buffer, urlsafe = false) {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            return urlsafe
                ? base64
                      .replace(/\+/g, "-")
                      .replace(/\//g, "_")
                      .replace(/=+$/, "")
                : base64;
        },
    };

    static base62 = {
        /**
         * Encode in base62
         * @param {Uint8Array} blob 
         * @returns 
         */
        encode(blob) {
            return BaseConverter.to_string(Bytes.bigint.encode(blob), 62);
        },
        /**
         * Decode in bytes
         * @param {string} base62string 
         * @returns {uint8Array}
         */
        decode(base62string) {
            return Bytes.bigint.decode(BaseConverter.from_string(base62string));
        },
    };

    static base32 = {
        /**
         * Converte una stringa in base32 in un array di byte
         * @param {string} base32String
         * @returns {Uint8Array}
         */
        decode(base32String) {
            const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const output = [];
            let buffer = 0;
            let bitsInBuffer = 0;
            // ---
            for (const char of base32String) {
                const index = base32Alphabet.indexOf(char);
                if (index === -1) continue; // Ignora caratteri non validi
                // ---
                buffer = (buffer << 5) | index;
                bitsInBuffer += 5;
                // ---
                if (bitsInBuffer >= 8) {
                    output.push((buffer >> (bitsInBuffer - 8)) & 255);
                    bitsInBuffer -= 8;
                }
            }
            // ---
            return new Uint8Array(output);
        },
        /**
         * Converte i byte in una stringa in base32
         * @param {Uint8Array} uint8Array
         * @returns
         */
        encode(uint8Array) {
            const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let output = '';
            let buffer = 0;
            let bitsInBuffer = 0;
            // ---
            for (const byte of uint8Array) {
                buffer = (buffer << 8) | byte;
                bitsInBuffer += 8;
                while (bitsInBuffer >= 5) {
                    output +=
                        base32Alphabet[(buffer >> (bitsInBuffer - 5)) & 31];
                    bitsInBuffer -= 5;
                }
            }
            // ---
            if (bitsInBuffer > 0) {
                output += base32Alphabet[(buffer << (5 - bitsInBuffer)) & 31];
            }
            // ---
            return output;
        },
    };

    static hex = {
        /**
         * Converte una stringa esadecimale in una stringa di testo
         * @param {string} hex_string
         * @returns
         */
        _hex(hex_string) {
            return hex_string
                .match(/.{1,2}/g)
                .map((byte) => String.fromCharCode(parseInt(byte, 16)))
                .join("");
        },
        /**
         * Converte una stringa di testo in una stringa esadecimale
         * @param {string} text
         * @returns {string}
         */
        hex_(text) {
            return Array.from(text)
                .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("");
        },
        /**
         * Converte una stringa esadecimale in un Uint8Array
         * @param {string} hex
         * @returns {Uint8Array}
         */
        decode(hex) {
            hex = hex.replace(/\s+/g, '').toLowerCase();
            if (hex.length % 2 !== 0) {
                throw new Error("Hex string must have an even length");
            }
            const length = hex.length / 2;
            const array = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                array[i] = parseInt(hex.substr(i * 2, 2), 16);
            }
            return array;
        },
        /**
         * Converte un Uint8Array in una stringa esadecimale
         * @param {string} array
         * @returns {string}
         */
        encode(array) {
            return Array.from(array)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
        },
    };

    static txt = {
        /**
         * Converte una stringa di testo in un Uint8Array
         * @param {string} txt
         * @returns {Uint8Array}
         */
        from(txt) {
            return new TextEncoder().encode(txt);
        },
        /**
         * Converte un Uint8Array in una stringa di testo
         * @param {Uint8Array} buffer
         * @returns {string}
         */
        to(buffer) {
            return new TextDecoder().decode(buffer);
        },
        /**
         * Converte una stringa di testo in base64
         * @param {String} txt
         */
        base64_(txt) {
            const B = new TextEncoder().encode(txt);
            return Buffer.base64._bytes(B);
        },
        /**
         * Converte una stringa base64 in testo
         * @param {String} base64
         */
        _base64(base64) {
            const txt = Buffer.base64.bytes_(base64);
            return new TextDecoder().decode(txt);
        },
        /**
         * Converte del testo in un Uint16Array
         * @param {String} txt
         * @returns
         */
        Uint16_(txt) {
            let B = typeof txt === "string" ? this.bytes_(txt) : txt;
            const length = B.length;
            // -- aggiungi padding se necessario
            const padded_length = length + (length % 2);
            // ---
            const U16 = new Uint16Array(padded_length / 2);
            for (let i = 0; i < length; i += 2) {
                U16[i / 2] = (B[i] | (B[i + 1] << 8)) >>> 0;
            }
            // ---
            return U16;
        },
    };

    static bigint = {
        /**
         * Converte un BigInt in un Uint8Array
         * @param {BigInt} n
         * @returns {Uint8Array}
         */
        decode(n) {
            const L = Math.ceil(n.toString(2).length / 8);
            // ---
            const B = new Uint8Array(L);
            for (let i = 0; i < L; i++) {
                B[i] = Number(n & 255n);
                n >>= 8n;
            }
            // ---
            return B.reverse();
        },
        /**
         * Converte un Uint8Array in un BigInt
         * @param {Uint8Array} buffer 
         * @returns {BigInt}
         */
        encode(byte) {
            let n = 0n;
            const L = byte.length;
            // ---
            for (let i = 0; i < L; i++) {
                n = (n << 8n) | BigInt(byte[i]);
            }
            // ---
            return n;
        },
    };

    static pem = {
        /**
         * Converte dei dati binari rappresentati una chiave pubblica o privata in formato pem
         * @param {Uint8Array|ArrayBuffer} blob 
         * @returns 
         */
        encode(blob, label) {
            const base64 = Bytes.base64.encode(blob);
            return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----`;
        }
    }

    /**
     * Unisce n Uint8Array in un unico Uint8Array
     * @param {ArrayBuffer} buffers
     * @param {number} size
     * @returns
     */
    static merge(buffers, size) {
        // -- ottengo la lunghezza totale
        let length = 0;
        for (const buffer of buffers) {
            length += buffer.length;
        }
        // -- unisci tutti gli array
        let merged_array;
        // ---
        switch (size) {
            case 8:
                merged_array = new Uint8Array(length);
                break;
            case 16:
                merged_array = new Uint16Array(length);
                break;
            case 32:
                merged_array = new Uint32Array(length);
                break;
            default:
                throw new Error("Invalid size");
        }
        // ---
        let offset = 0;
        for (const buffer of buffers) {
            merged_array.set(buffer, offset);
            offset += buffer.length;
        }
        // --
        return merged_array;
    }
    /**
     * Compara due Buffer verificando se sono uguali
     * @param {Array} a
     * @param {Array} b
     * @returns
     */
    static compare(a, b) {
        if (a.length != b.length)
            throw new Error("Invalid size a is different than b");
        // ---
        const L = a.length;
        // ---
        for (let i = 0; i < L; i++) {
            if (a[i] !== b[i]) return false;
        }
        // ---
        return true;
    }
}

window.Bytes = Bytes;