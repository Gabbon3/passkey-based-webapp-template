/**
 * Classe per implementare l'algoritmo ECDH (Elliptic Curve Diffie-Hellman) utilizzando la Web Crypto API.
 */
export class ECDH {
    /**
     * Genera una coppia di chiavi pubblica e privata ECDH.
     * Restituisce ogni chiave sia in formato utilizzabile CryptoKey, sia in formato grezzo Uint8Array.
     * @param {string} [curve='P-256'] di default quella piu comune ma puo anche essere 'P-384' o 'P-521'
     * @returns {Promise<{public_key: [CryptoKey, Uint8Array], private_key: [CryptoKey, Uint8Array]}>} La chiave pubblica in formato Uint8Array e la chiave privata in formato CryptoKey.
     */
    static async generate_keys(curve = 'P-256') {
        // -- genero la coppia di chiavi ECDH usando la curva P-256
        const key_pair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: curve,
            },
            true, // - la chiave è esportabile
            ["deriveKey", "deriveBits"]
        );
        // -- esporto le chiavi
        const exported_public_key = await window.crypto.subtle.exportKey("raw", key_pair.publicKey);
        const exported_private_key = await window.crypto.subtle.exportKey("pkcs8", key_pair.privateKey);
        // -- restituisco le chiavi
        return {
            public_key: [key_pair.publicKey, new Uint8Array(exported_public_key)],
            private_key: [key_pair.privateKey, new Uint8Array(exported_private_key)],
        };
    }

    /**
     * Importa una chiave pubblica ECDH da un array di byte in formato RAW.
     * @param {Uint8Array} public_key - La chiave pubblica in formato grezzo Uint8Array.
     * @param {string} [curve='P-256'] 
     * @returns {Promise<CryptoKey>} La chiave pubblica importata come CryptoKey.
     */
    static async import_public_key(public_key, curve = 'P-256') {
        // -- importo la chiave pubblica ricevuta in formato SPKI
        return await window.crypto.subtle.importKey(
            "raw", // - formato della chiave
            public_key, // - la chiave pubblica in formato Uint8Array
            {
                name: "ECDH",
                namedCurve: curve, // - la curva deve essere la stessa
            },
            true, // - la chiave è esportabile
            []
        );
    }

    /**
     * Converte una chiave privata in formato Uint8Array in un CryptoKey per uso con ECDH.
     * @param {Uint8Array} private_key_bytes - La chiave privata in formato Uint8Array.
     * @param {string} [curve='P-256'] 
     * @returns {Promise<CryptoKey>} La chiave privata importata come CryptoKey.
     */
    static async import_private_key(private_key_bytes, curve = 'P-256') {
        return window.crypto.subtle.importKey(
            "pkcs8", // - il formato
            private_key_bytes, // - chiave privata come Uint8Array
            {
                name: "ECDH",
                namedCurve: curve,
            },
            true, // - la chiave è esportabile
            ["deriveKey", "deriveBits"]
        );
    }

    /**
     * Deriva una chiave condivisa utilizzando una chiave privata e una chiave pubblica.
     * @param {CryptoKey} private_key - La chiave privata in formato CryptoKey.
     * @param {CryptoKey} public_key - La chiave pubblica in formato CryptoKey.
     * @returns {Promise<Uint8Array>} La chiave condivisa derivata come Uint8Array.
     */
    static async derive_shared_secret(private_key, public_key) {
        // -- derivo la chiave condivisa utilizzando la chiave privata e la chiave pubblica
        const shared_secret = await window.crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: public_key,
            },
            private_key,
            256 // - dimensione della chiave risultante (può essere 256, 384, 521)
        );
        // - restituisce la chiave condivisa come Uint8Array
        return new Uint8Array(shared_secret);
    }

    /**
     * Esporta una chiave privata in formato PKCS#8.
     * @param {CryptoKey} private_key - La chiave privata in formato CryptoKey.
     * @returns {Promise<Uint8Array>} La chiave privata esportata come Uint8Array.
     */
    static async export_private_key(private_key) {
        const exported_private_key = await window.crypto.subtle.exportKey("pkcs8", private_key);
        return new Uint8Array(exported_private_key);
    }
}