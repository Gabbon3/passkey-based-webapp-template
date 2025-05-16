import jwt from 'jsonwebtoken';

export class JWT {
    /**
     * Tempi di scadenza dei token in secondi
     */
    static expires = {
        accessToken: 15 * 60,
    }

    /**
     * Crea un JWT generico
     * @param {Object} payload
     * @param {number} lifetime - tempo di scadenza del jwt in secondi
     * @param {Uint8Array} key - chiave da usare per firmare questo jwt
     * @returns il jwt in formato stringa
     */
    static create(payload, lifetime, key) {
        const now = Math.floor(Date.now() / 1000);
        // -- genero il JWT
        const token = jwt.sign({
            ...payload,
            iat: now,
            exp: now + lifetime
        }, key);
        // -- restituisco il token
        return token;
    }
    /**
     * Verifica un JWT
     * @param {string} token 
     * @param {Uint8Array} key 
     * @returns restituisce null se non è valido oppure il payload
     */
    static verify(token, key) {
        try {
            // -- provo a verificare il jwt
            // - se invalido lancerà un errore quindi lo catturo
            // - e restituisco null
            return jwt.verify(token, key);
        } catch (error) {
            // -- il token non è valido
            console.log(error);
            
            return null;
        }
    }
}