import jwt, { JwtPayload } from 'jsonwebtoken';
import { Config } from "../serverConfig.js";

type JWTKeyName = 'default' | 'passkey';

export class JWT {
    // ---
    /**
     * Raccolta delle chiavi da usare nei tokens
     * sono entrambe due Buffer
     */
    static keys = {
        default: Config.ACCESS_TOKEN_SECRET, // chiave per firmare i jwt base
        passkey: Config.PASSKEY_TOKEN_SECRET, // chiave per firmare i jwt emessi da passkeys
    }
    // -- proprietà dei jwt o cookie
    static secure_option = true;

    /**
     * Crea un JWT generico
     * @param payload
     * @param lifetime - tempo di scadenza del jwt in secondi
     * @param key - nome della chiave da usare
     * @returns il jwt in formato stringa
     */
    static create(payload: object, lifetime: number, key: JWTKeyName): string {
        const now = Math.floor(Date.now() / 1000);
        // -- genero il JWT
        const token = jwt.sign({
            ...payload,
            iat: now,
            exp: now + lifetime
        }, JWT.keys[key]);
        // -- restituisco il token
        return token;
    }
    /**
     * Verifica un JWT
     * @param token 
     * @param key 
     * @returns restituisce null se non è valido oppure il payload
     */
    static verify(token: string, key: JWTKeyName): string | JwtPayload | null {
        try {
            // -- provo a verificare il jwt
            // - se invalido lancerà un errore quindi lo catturo
            // - e restituisco null
            return jwt.verify(token, JWT.keys[key]);
        } catch (error) {
            // -- il token non è valido
            return null;
        }
    }
}