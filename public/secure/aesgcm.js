/**
 * Classe statica per la cifratura e decifratura dei dati usando AES-256-GCM con le Web Crypto API.
 */
export class AES256GCM {
    // mappa di supporto per riutilizzare le stesse crypto key
    static keyMap = new Map();
    /**
     * Importa una chiave AES-256-GCM da un buffer, se necessario.
     * Se riceve già una CryptoKey, la restituisce direttamente.
     * 
     * @param {Uint8Array|CryptoKey} key_input
     * @returns {Promise<CryptoKey>}
     */
    static async resolve_key(key_input) {
        if (key_input instanceof CryptoKey) return key_input;
        if (key_input instanceof Uint8Array && key_input.length === 32) {
            // -- verifico se la chiave non è in cache
            const hash = [...key_input].join('');
            if (this.keyMap.has(hash)) return this.keyMap.get(hash);
            // -- se non lo è importo la cripto key e metto in cache
            const key = await crypto.subtle.importKey(
                "raw",
                key_input,
                { name: "AES-GCM" },
                false,
                ["encrypt", "decrypt"]
            );
            this.keyMap.set(hash, key);
            return key;
        }
        throw new Error('Invalid key format. Expected 32-byte Uint8Array or CryptoKey.');
    }
    /**
     * Cifra i dati utilizzando AES-256-GCM.
     * 
     * @param {Uint8Array} data - I dati da cifrare.
     * @param {Uint8Array|CryptoKey} key_buffer - La chiave di cifratura (32 byte per AES-256).
     * @returns {Promise<Uint8Array>} - I dati cifrati concatenati con il nonce e il tag di autenticazione.
     */
    static async encrypt(data, key_buffer) {
        // -- genero un nonce casuale di 12 byte
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        // -- importo la chiave
        const key = await this.resolve_key(key_buffer);
        // -- cifro i dati usando AES-GCM
        const cipher = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: nonce,
            },
            key,
            data
        );
        // -- estraggo il tag di autenticazione (ultimi 16 byte della cifratura)
        const encrypted_data = new Uint8Array(cipher);
        // -- concateno nonce, dati cifrati e tag di autenticazione
        return new Uint8Array([...nonce, ...encrypted_data]);
    }

    /**
     * Decifra i dati con AES-256-GCM.
     * 
     * @param {Uint8Array} encrypted - I dati cifrati concatenati (nonce + dati cifrati + tag).
     * @param {Uint8Array} key_buffer - La chiave di decifratura (32 byte per AES-256).
     * @returns {Promise<Uint8Array>} - I dati decifrati.
     */
    static async decrypt(encrypted, key_buffer) {
        // -- estraggo il nonce, i dati cifrati e il tag di autenticazione
        const nonce = encrypted.slice(0, 12);
        const encrypted_data = encrypted.slice(12);
        // -- importo la chiave
        const key = await this.resolve_key(key_buffer);
        // -- cifro i dati usando AES-GCM
        try {
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce,
                    tagLength: 128, // L'AES-GCM ha un tag di 128 bit (16 byte)
                },
                key,
                encrypted_data
            );
            return new Uint8Array(decrypted);
        } catch (error) {
            throw new Error('Decryption failed: ' + error.message);
        }
    }
}

window.AES256GCM = AES256GCM;