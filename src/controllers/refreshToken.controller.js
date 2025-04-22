import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import { Bytes } from "../utils/bytes.util.js";
import { Roles } from "../config/roles.js";
import { JWT } from "../utils/jwt.util.js";
import { User } from "../models/user.model.js";

export class RefreshTokenController {
    constructor() {
        this.service = new RefreshTokenService();
    }
    /**
     * Genera un nuovo access token se il refresh token è valido
     * @param {Request} req 
     * @param {Response} res 
     */
    generateAccessToken = asyncHandler(async (req, res) => {
        const refresh_token_cookie = req.cookies.refresh_token;
        if (!refresh_token_cookie) throw new CError("AuthenticationError", "Invalid refresh token", 403);
        // -- hash del token
        const token_hash = this.service.getTokenDigest(refresh_token_cookie);
        // ---
        const user_agent = req.get('user-agent');
        /**
         * effettuo la rotazione del token qui, quindi quello ottenuto sarà il nuovo refresh token
         */
        const refresh_token = await this.service.verify({ user_id: req.user.uid, token_hash }, user_agent, true);
        if (!refresh_token) throw new CError("AuthenticationError", "Invalid refresh token", 403);
        /**
         * Genero l'access token
         */
        const access_token = await JWT.create(
            { uid: req.user.uid, role: Roles.BASE },
            JWT.expires.accessToken,
            'default'
        );
        // -- ottengo l'ip adress del richiedente
        /**
         * DEPRECATED: nessun indirizzo ip memorizzato mantenere il modello zero-knowledge
         */
        // const ip_address = req.headers['x-forwarded-for'] || req.ip;
        // -- aggiorno l'ultimo utilizzo del refresh token
        await this.service.updateToken({ token_hash }, {
            last_used_at: new Date().toISOString(),
            // ip_address: ip_address ?? ''
        });
        /**
         * Imposto i cookie
         */
        res.cookie('access_token', access_token, {
            httpOnly: true,
            secure: JWT.secure_option, // da mettere true in produzione
            maxAge: JWT.access_token_cookie_lifetime,
            sameSite: 'Strict',
            path: '/', // disponibile per tutte le route
        });
        res.cookie('refresh_token', refresh_token.plain, {
            httpOnly: true,
            secure: true,
            maxAge: JWT.refresh_token_cookie_lifetime,
            sameSite: 'Strict',
            path: '/auth',
        });
        // ---
        res.status(201).json({ uid: req.user.uid, access_token });
    })
    /**
     * Restituisce tutti i token associati ad un utente
     * evidenzia quello attuale
     * @param {Request} req 
     * @param {Response} res 
     */
    getAll = asyncHandler(async (req, res) => {
        const tokens = await this.service.getAll(req.user.uid, req.cookies.refresh_token);
        res.status(200).json( tokens );
    })
    /**
     * Revoca o riattiva un refresh token
     * @param {Request} req body { token_id, revoke }
     * @param {Response} res 
     */
    revoke = asyncHandler(async (req, res) => {
        const { token_id, revoke } = req.body;
        const current_token = req.cookies.refresh_token;
        if (token_id === current_token) throw new CError('SelfRevocationError', "Self-revocation of the current device's token is not allowed.", 403);
        // ---
        await this.service.revoke({ id: token_id }, revoke);
        res.status(200).json({ "revoked": revoke });
    });
    /**
     * Riattiva un refresh token revocato tramite controllo mfa
     * @param {Request} req body { token_id }
     * @param {Response} res 
     */
    unlock = asyncHandler(async (req, res) => {
        const current_token = req.cookies.refresh_token;
        if (!current_token) throw new Error('ValidationError', 'Any token avaiable', 404);
        // ---
        const token_hash = this.service.getTokenDigest(current_token);
        // ---
        let uid = req.user?.uid ?? null;
        if (!uid) {
            const { email } = req.user;
            const user = await User.findOne({
                where: { email },
                attributes: ['id'],
            });
            uid = user.id;
        }
        const [affectedCount] = await this.service.updateToken({ user_id: uid, token_hash: token_hash }, {
            is_revoked: false
        });
        // ---
        if (affectedCount === 0) throw new CError("", "The email entered is not associated with this device", 403);
        let message = 'Device unlocked';
        // if (affectedCount === 0) message = 'The device was already unlocked';
        res.status(200).json({ message });
    });
    /**
     * Revoca tutti i refresh token associati ad un utente
     * @param {Request} req 
     * @param {Response} res 
     */
    revokeAll = asyncHandler(async (req, res) => {
        await this.service.revokeAll(req.user.uid);
        res.sendStatus(200);
    });
    /**
     * Rinomina un token
     */
    rename = asyncHandler(async (req, res) => {
        const { token_id, device_name } = req.body;
        // ---
        await this.service.updateToken({ user_id: req.user.uid, id: token_id }, { device_name });
        res.status(200).json({ "renamed": true });
    });
    /**
     * Elimina un refresh token
     * @param {*} req 
     * @param {*} res 
     */
    delete = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await this.service.delete({
            user_id: req.user.uid,
            id: id
        });
        res.status(200).json({ "deleted": true });
    });
}