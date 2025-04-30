import { Op } from 'sequelize';
import { JWT } from "../utils/jwt.util.js";
import { CError } from "../helpers/cError.js";
import { User } from "../models/user.model.js";
import { Roles } from "../config/roles.js";
import { Mailer } from "../lib/mailer.js";
import automatedEmails from "../config/automatedMails.js";
import { SecureLayer } from '../utils/secureLayer.util.js';

export class SuperAuthService {
    /**
     * Registra un utente sul db
     * @param {string} email
     * @param {boolean} [verified=false] se true, allora l'utente creato sarà già validato
     * @returns {User}
     */
    async signup(email, verified = false) {
        email = email.toLowerCase();
        // -- verifico che l'indirizzo email sia valido
        if (!this.verifyEmail(email)) throw new CError("InvalidEmailDomain", "The email domain is not supported. Please use a well-known email provider like Gmail, iCloud, or Outlook.", 422);
        // -- verifico che l'email sia disponibile
        const user_exist = await User.findOne({
            where: { email }
        });
        if (user_exist) throw new CError("UserExist", "This email is already in use", 409);
        // -- creo un nuovo utente
        const user = new User({ email, verified });
        // ---
        return await user.save();
    }
    /**
     * Utility per verificare l'email dell'utente
     * @param {string} email 
     * @returns {boolean}
     */
    verifyEmail(email) {
        const verified_domains = [
            'gmail.com',    // Google
            'icloud.com',   // Apple
            'outlook.com',  // Microsoft
            'hotmail.com',  // Microsoft (più vecchio, ma ancora usato)
            'yahoo.com',    // Yahoo
            'live.com',     // Microsoft
            'libero.it',    // Libero
        ];
        // ---
        return verified_domains.includes(email.split('@')[1]);
    }
    /**
     * 
     * @param {string} email
     * @param {string} publicKeyHex - chiave pubblica ECDH del client in esadecimale
     * @returns {}
     */
    async signin({ email, publicKeyHex }) {
        // -- cerco se l'utente esiste
        const user = await User.findOne({
            where: { email }
        });
        if (!user) throw new CError("AuthenticationError", "Invalid email", 401);
        if (user.verified !== true) throw new CError("AuthenticationError", "Email is not verified", 401);
        // ---
        const { kid, keyPair } = await SecureLayer.calculateSharedSecret(publicKeyHex);
        /**
         * Genero l'access token
         */
        const accessToken = JWT.create({ uid: user.id, role: Roles.BASE, kid }, 3600);
        /**
         * restituisco quindi:
         *  - l'access token
         *  - la chiave pubblica del server
         */
        return { accessToken, publicKey: keyPair.public_key.toString("hex") };
    }
    /**
     * Crea e restituisce un refresh token
     * invia una mail di nuovo accesso se il refresh token viene inizialmente bloccato
     * motivo: non è il primo refresh token associato all'utente
     * @param {User} user - modello dello user
     * @param {string} user_agent 
     * @param {string} ip_address 
     * @param {string} email 
     * @param {string} passKey - stringa che se valida abilita a priori il refresh token -> viene creato un refresh valido
     * @returns {RefreshToken} 
     */
    async createRefreshToken(user, user_agent, ip_address, email, passKey) {
        // ottengo un Model di Refresh token dal suo servizio
        const refresh_token = await this.refresh_token_service.create(user.id, user_agent, ip_address, passKey);
        // -- avviso l'utente se un nuovo dispositivo accede
        if (refresh_token.is_revoked) {
            // -- ottengo il testo
            const { text, html } = automatedEmails.newSignIn({
                email,
                user_agent: refresh_token.user_agent_summary,
                ip_address,
            });
            // -- invio la mail
            await Mailer.send(
                email, 
                'New device Sign-In', 
                text,
                html
            );
        }
        return refresh_token;
    }
    /**
     * Restituisce tutti gli utenti
     * ricercando in like in questo modo %email%
     * @param {string} email 
     * @param {number} limit 
     * @returns {Array}
     */
    async search(email, limit = 25) {
        return await User.findAll({
            attributes: ['id', 'email'],
            where: {
                email: {
                    [Op.like]: `%${email}%` // Works in PostgreSQL
                }
            },
            limit: limit
        });
    }
    /**
     * Aggiorna un qualunque campo dell'utente
     * @param {string} id - user id
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns {Array} [affectedCount]
     */
    async updateUser({ id, email }, updated_info) {
        const where = id ? { id } : { email };
        // ---
        return await User.update(
            updated_info,
            { where }
        );
    }
    /**
     * Elimina un utente secondo le condizioni passate in input nel parametro where {}
     * @param {object} where 
     * @returns {number} numero di record eliminati
     */
    async delete(where) {
        return await User.destroy({ where });
    }
}