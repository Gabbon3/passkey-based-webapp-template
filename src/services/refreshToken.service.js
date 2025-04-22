import { UAParser } from "ua-parser-js";
import { RefreshToken } from "../models/refreshToken.model.js";
import { Cripto } from "../utils/cripto.util.js";
import { RamDB } from "../utils/ramdb.js";
import { CError } from "../helpers/cError.js";

export class RefreshTokenService {
    static random_c_length = 10;
    static max_tempo_inattivita = 30 * 24 * 60 * 60 * 1000;
    /**
     * Crea un nuovo refresh token salvandolo sul db e restituendolo
     * @param {string} user_id
     * @param {string} user_agent
     * @param {string} ip_address
     * @returns {string}
     */
    async create(user_id, user_agent, ip_address, passKey) {
        // -- User Agent
        const ua = UAParser(user_agent);
        const user_agent_summary = `${ua.browser.name ?? ""}-${ua.browser.major ?? ""}-${ua.os.name ?? ""}-${ua.os.version ?? ""}`;
        const user_agent_hash = this.user_agent_hash(user_agent);
        // -- verifico se la passKey è valida
        const is_valid_passkey = RamDB.get(`pk${passKey}`);
        let count = 0;
        // - se è valida elimino la chiave e lascio il refresh token valido
        if (is_valid_passkey) RamDB.delete(`pk${passKey}`);
        else count = await this.count(user_id);
        // -- conto i refresh token
        // -- se non ci sono token associati quindi si tratta del primo accesso
        // -- abilito il token, se no bisogna approvarlo
        const revoke_this_token = count > 0;
        // -- genero il token casualmente 32 byte
        const plain_token = Cripto.random_bytes(32, 'hex');
        // ---
        const token_hash = this.getTokenDigest(plain_token);
        // ---
        const token = await RefreshToken.create({
            token_hash,
            user_id,
            user_agent_summary,
            user_agent_hash,
            ip_address: ip_address ?? '',
            is_revoked: revoke_this_token
        });
        // -- aggiungo il token non hashato
        token.plain = plain_token;
        // ---
        return token ? token : null;
    }
    /**
     * Aggiorna qualsiasi campo di un token 
     * @param {object} where_conditions - oggetto con le condizioni per trovare il token (tipo uid, id o token_hash)
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns {Array} [affectedRows]
     */
    async updateToken(where_conditions, updated_info) {
        return await RefreshToken.update(
            updated_info,
            { where: where_conditions }
        );
    }
    /**
     * Verifica se un token esiste
     * @param {object} where_conditions 
     * @returns {boolean}
     */
    async exists(where_conditions) {
        const token = await RefreshToken.findOne({ where: where_conditions });
        return token ? true : false;
    }
    /**
     * Revoca no un token
     * @param {object} where
     * @param {boolean} is_revoked
     */
    async revoke(where, is_revoked) {
        return await RefreshToken.update(
            { is_revoked },
            { where }
        );
    }
    /**
     * Revoca tutti i token associati ad un utente
     * @param {string} user_id
     * @returns
     */
    async revokeAll(user_id) {
        return await RefreshToken.update(
            { is_revoked: true },
            { where: { user_id } }
        );
    }
    /**
     * Restituisce il numero totale di refresh token associati ad un utente
     * @param {number} user_id 
     * @returns {number}
     */
    async count(user_id) {
        return await RefreshToken.count({
            where: {
                user_id
            }
        });
    }
    /**
     * Restituisce tutti i token associati ad un utente
     * @param {string} user_id
     * @returns
     */
    async getAll(user_id, current_token_id) {
        const hash_current = this.getTokenDigest(current_token_id);
        const tokens = await RefreshToken.findAll({
            where: { user_id },
            attributes: {
                exclude: ['user_id', 'user_agent_hash']
            }
        });
        // -- converto in json e verifico per ogni token se l'id corrisponde a quello corrente
        const tokens_json = tokens.map(token => {
            const token_json = token.get();
            token_json.current = token_json.token_hash === hash_current;
            return token_json;
        });
        // ---
        return tokens_json;
    }
    /**
     * Elimina tutti i token associati ad un utente e ad un dispositivo
     * utile per non accumulare token sullo stesso dispositivo
     * @param {string} user_id
     * @param {string} user_agent_hash
     * @returns
     */
    async delete_old_tokens(user_id, user_agent_hash) {
        return await RefreshToken.destroy({
            where: {
                user_id,
                user_agent_hash,
            },
        });
    }
    /**
     * Elimina un token
     * @param {object} where_conditions
     * @returns {number} numero di record eliminato
     */
    async delete(where_conditions) {
        // ---
        return await RefreshToken.destroy({
            where: where_conditions,
        });
    }
    /**
     * Verifica la validità dei refresh token restituendo le informazioni associate se valido
     * @param {object} where_conditions - oggetto per trovare il token (user_id, token_hash, id)
     * @param {string} user_agent
     * @param {boolean} [rotate=false] se true, viene effettuata la rotazione del token
     * @returns {null | boolean | RefreshToken} null se non esiste sul db, false se esiste ma è revocato, RefreshToken se è valido
     */
    async verify(where_conditions, user_agent, rotate = false) {
        // ---
        const refresh_token = await RefreshToken.findOne({ where: where_conditions });
        // -- se il token non esiste o non è associato a quell'utente non è valido
        if (!refresh_token) return null;
        // -- se il token è stato revocato non è valido
        if (refresh_token.is_revoked === true) return false;
        // -- se il token è inutilizzato da piu di 30 giorni non è piu valido
        const scadenza =
            refresh_token.last_used_at.getTime() + RefreshTokenService.max_tempo_inattivita;
        if (scadenza < Date.now()) return false;
        /**
         * Effettuo la rotazione del token se richiesto
         * e restituisco quello anziche il precedente
         */
        if (rotate) {
            const new_refresh_token = await this.rotate(refresh_token);
            return new_refresh_token;
        }
        // -- se l'user agent non corrisponde non è valido, rimosso poichè superfluo
        // const user_agent_hash = this.user_agent_hash(user_agent);
        // if (user_agent_hash != refresh_token.user_agent_hash) return false;
        // ---
        return refresh_token;
    }
    /**
     * Effettua la rotazione di un refresh token
     * @param {RefreshToken} refresh_token 
     */
    async rotate(refresh_token) {
        const new_random_token = Cripto.random_bytes(32, 'hex');
        const hash_new_random_token = this.getTokenDigest(new_random_token);
        // ---
        const [affectedRows] = await this.updateToken({
            token_hash: refresh_token.token_hash
        }, {
            token_hash: hash_new_random_token
        });
        if (affectedRows === 0) throw new CError('', 'Error while rotate refresh token', 500);
        // -- restituisco il refresh token
        const updated_token = await RefreshToken.findOne({ where: { token_hash: hash_new_random_token }});
        updated_token.plain = new_random_token;
        return updated_token;
    }
    /**
     * Valida un refresh token
     * @param {string} token - stringa esadecimale da 32 byte
     */
    validateRefreshToken(token) {
        return typeof token === 'string' && token.length === 64;
    }
    /**
     * Effettua l'hash del token
     */
    digest_where_token_hash(where) {
        if (!where.token_hash) return;
        where.token_hash = this.getTokenDigest(where.token_hash);
    }
    /**
     * Restituisce il token hashato
     * @param {string} token 
     * @returns {string}
     */
    getTokenDigest(token) {
        return Cripto.hash(token, { algorithm: 'sha256', encoding: 'hex' });
    }
    /**
     * Crea l'hash MD5 dell'user agent restituendo in formato hex
     * @param {string} user_agent
     * @returns {string} hex string
     */
    user_agent_hash(user_agent) {
        return Cripto.hash(user_agent, { algorithm: "md5", encoding: "hex" });
    }
}
