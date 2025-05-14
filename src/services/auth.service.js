import { Op } from "sequelize";
import { JWT } from "../utils/jwt.util.js";
import { CError } from "../helpers/cError.js";
import { User } from "../models/user.model.js";
import { AuthKeys } from "../models/authKeys.model.js";
import { Roles } from "../config/roles.js";
import { PULSE } from "../protocols/PULSE.node.js";

export class AuthService {
    constructor() {
        this.pulse = new PULSE();
    }
    /**
     * Registra un utente sul db
     * @param {string} email
     * @param {boolean} [verified=false] se true, allora l'utente creato sarà già validato
     * @returns {User}
     */
    async signup(email, verified = false) {
        email = email.toLowerCase();
        // -- verifico che l'email sia disponibile
        const user_exist = await User.findOne({
            where: { email },
        });
        if (user_exist)
            throw new CError("UserExist", "This email is already in use", 409);
        // -- creo un nuovo utente
        const user = new User({ email, verified });
        // ---
        return await user.save();
    }
    /**
     *
     * @param {Request} request
     * @param {string} email
     * @param {string} publicKeyHex - chiave pubblica ECDH del client in esadecimale
     * @returns {}
     */
    async signin({ request, email, publicKeyHex }) {
        // -- cerco se l'utente esiste
        const user = await User.findOne({
            where: { email },
        });
        if (!user)
            throw new CError("AuthenticationError", "Invalid email", 401);
        if (user.verified !== true)
            throw new CError(
                "AuthenticationError",
                "Email is not verified",
                401
            );
        /**
         * Stabilisco la sessione con PULSE
         */
        const { jwt, publicKey } = await this.pulse.generateSession({
            request: request,
            publicKeyHex,
            userId: user.id,
            payload: { uid: user.id },
        });
        // ---
        return { uid: user.id, jwt, publicKey };
    }

    /**
     * Elimina dal db la auth key
     * @param {string} guid
     */
    async signout(guid) {
        const kid = await this.pulse.calculateKid(guid);
        // ---
        return await AuthKeys.destroy({
            where: {
                kid: kid,
            },
        });
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
            attributes: ["id", "email"],
            where: {
                email: {
                    [Op.like]: `%${email}%`, // Works in PostgreSQL
                },
            },
            limit: limit,
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
        return await User.update(updated_info, { where });
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
