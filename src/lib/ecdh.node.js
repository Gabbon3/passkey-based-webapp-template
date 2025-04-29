import crypto from 'crypto';

export class ECDH {
    /**
     * Genera una coppia di chiavi pubblica e privata ECDH.
     * @param {string} [curve='prime256v1'] - La curva da usare (es. 'prime256v1', 'secp384r1', 'secp521r1')
     * @returns {{public_key: Buffer, private_key: Buffer}} La chiave pubblica e la chiave privata in formato Buffer.
     */
    static generateKeys(curve = 'prime256v1') {
        const ecdh = crypto.createECDH(curve);
        ecdh.generateKeys();
        return {
            public_key: ecdh.getPublicKey(),
            private_key: ecdh.getPrivateKey(),
        };
    }

    /**
     * Importa una chiave pubblica.
     * @param {Buffer} public_key - La chiave pubblica in formato Buffer.
     * @param {string} [curve='prime256v1'] - La curva usata.
     * @returns {crypto.ECDH} Un'istanza ECDH con la chiave pubblica impostata.
     */
    static importPublicKey(public_key, curve = 'prime256v1') {
        const ecdh = crypto.createECDH(curve);
        ecdh.setPublicKey(public_key);
        return ecdh;
    }

    /**
     * Deriva una chiave condivisa utilizzando una chiave privata e una chiave pubblica.
     * @param {Buffer} private_key - La chiave privata in formato Buffer.
     * @param {Buffer} public_key - La chiave pubblica in formato Buffer.
     * @param {string} [curve='prime256v1'] - La curva usata.
     * @returns {Uint8Array} La chiave condivisa derivata.
     */
    static deriveSharedSecret(private_key, public_key, curve = 'prime256v1') {
        const ecdh = crypto.createECDH(curve);
        ecdh.setPrivateKey(private_key);
        // ---
        const secret = ecdh.computeSecret(public_key);
        return new Uint8Array(secret);
    }
}