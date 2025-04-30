import crypto from 'crypto';
/**
 * Classe statica per la cifratura e decifratura dei dati usando AES-256-GCM.
 */
export class AES256GCM {
    /**
     * Cifra i dati utilizzando AES-256-GCM.
     * 
     * @param {Uint8Array} data - I dati da cifrare.
     * @param {Uint8Array} key - La chiave di cifratura (32 byte per AES-256).
     * @returns {Uint8Array} - I dati cifrati concatenati con il nonce e il tag di autenticazione.
     */
    static encrypt(data, key) {
        // -- genero un nonce casuale di 12 byte
        const nonce = crypto.randomBytes(12);
        // -- creo un'istanza di un cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
        // -- cifro i dati
        const encrypted_data = Buffer.concat([cipher.update(data), cipher.final()]);
        // -- recupero il tag di autenticazione
        const auth_tag = cipher.getAuthTag();
        // -- concateno nonce, dati cifrati e tag di autenticazione
        return new Uint8Array(Buffer.concat([nonce, encrypted_data, auth_tag]));
    }
    /**
     * Decifra i dati con AES-256-GCM.
     * 
     * @param {Uint8Array} encrypted - I dati cifrati concatenati (nonce + dati cifrati + tag).
     * @param {Uint8Array} key - La chiave di decifratura (32 byte per AES-256).
     * @returns {Uint8Array} - I dati decifrati.
     */
    static decrypt(encrypted, key) {
        // -- estraggo il nonce, i dati cifrati e il tag di autenticazione
        const nonce = encrypted.slice(0, 12);
        const authTag = encrypted.slice(-16);
        const encrypted_data = encrypted.slice(12, -16);
        // -- creo un'istanza di un decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
        // -- imposto il tag di autenticazione
        decipher.setAuthTag(authTag);
        // -- decifro i dati
        const decrypted_data = Buffer.concat([decipher.update(encrypted_data), decipher.final()]);
        return new Uint8Array(decrypted_data);
    }
}