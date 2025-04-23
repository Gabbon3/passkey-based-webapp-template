import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import { Bytes } from "../utils/bytes.util.js";
import { RefreshTokenService } from "../services/refreshToken.service.js";
import { AuthService } from "../services/auth.service.js";
import { Cripto } from "../utils/cripto.util.js";
import { JWT } from "../utils/jwt.util.js";
import { RamDB } from "../utils/ramdb.js";
import { Mailer } from "../lib/mailer.js";
import { Validator } from "../utils/validator.util.js";
import automatedEmails from "../config/automatedMails.js";
import { Config } from "../serverConfig.js";
import { v7 as uuidv7 } from "uuid";

export class AuthController {
    constructor() {
        this.service = new AuthService();
        this.refresh_token_service = new RefreshTokenService();
    }
    /**
     * Registra utente
     * @param {Request} req
     * @param {Response} res
     */
    signup = asyncHandler(async (req, res) => {
        const { email } = req.body;
        if (!email) {
            throw new CError(
                "ValidationError",
                "Email is required",
                422
            );
        }
        // ---
        const user = await this.service.signup(email);
        res.status(201).json({ message: "User registered", id: user.id });
    });
    /**
     * Accede
     * @param {Request} req
     * @param {Response} res
     */
    signin = asyncHandler(async (req, res) => {
        const { email, passKey } = req.body;
        const refresh_token_cookie = req.cookies.refresh_token;
        // ---
        if (!email) {
            throw new CError(
                "ValidationError",
                "Email is required",
                422
            );
        }
        // -- ottengo indirizzo ip e user agent
        const user_agent = req.get("user-agent");
        const ip_address = req.headers["x-forwarded-for"] || req.ip;
        /**
         * Servizio
         */
        const { access_token, refresh_token, user, bypass_token } =
            await this.service.signin({
                email,
                user_agent,
                ip_address,
                refresh_token_cookie,
                passKey
            });
        /**
         * per continuare, verifico per sicurezza se il refresh token è stato generato correttamente
         */
        if (!refresh_token) {
            this.deleteAllCookies(req, res);
            throw new CError('', 'Unable to sign-in with this device.', 400);
        }
        // ---
        this.setTokenCookies(res, {
            access_token,
            refresh_token,
            uid: user.id,
        });
        // ---
        if (!access_token) {
            return res.status(403).json({
                error: "This device is locked",
                refresh_token,
            });
        }
        // Rate Limiter Email - rimuovo dal ramdb il controllo sui tentativi per accedere all'account
        RamDB.delete(`login-attempts-${email}`);
        // ---
        res.status(201).json({
            access_token,
            refresh_token,
            salt: user.salt,
            bypass_token,
            uid: user.id,
        });
    });
    /**
     * Effettua la disconnessione eliminando i cookie e il refresh token
     */
    signout = asyncHandler(async (req, res) => {
        const refresh_token = req.cookies.refresh_token;
        // -- verifico se è valido
        if (!this.refresh_token_service.validateRefreshToken(refresh_token))
            throw new CError("", "Invalid refresh token", 400);
        // -- hash refresh token
        const token_hash =
            this.refresh_token_service.get_token_digest(refresh_token);
        // -- elimino il refresh token
        await this.refresh_token_service.delete({
            user_id: req.user.uid,
            token_hash: token_hash,
        });
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // ---
        res.status(200).json({ message: "Disconnected" });
    });
    /**
     * Rimuove tutti i cookie del client
     */
    clearCookies = asyncHandler(async (req, res) => {
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // ---
        res.status(200).json({ message: "All cookies cleared" });
    });
    /**
     * Elimina un account
     */
    delete = asyncHandler(async (req, res) => {
        const deletedCount = await this.service.delete({ id: req.user.uid });
        if (deletedCount === 0) throw new Error("Nessun utente eliminato");
        // -- elimino i cookie
        this.deleteAllCookies(req, res);
        // -- invio una mail
        // const { text, html } = automated_emails.deleteAccount({
        //     email,
        // });
        // Mailer.send(email, "Account Deletion Confirmation", text, html);
        // ---
        res.status(200).json({ message: "All data deleted successfully" });
    });
    /**
     * Elimina tutti i cookie
     * @param {Request} req
     * @param {Response} res
     */
    deleteAllCookies = (req, res) => {
        // ---
        Object.keys(req.cookies).forEach((cookie_name) => {
            res.clearCookie(cookie_name);
        });
    };
    /**
     * Restituisce una lista di utenti
     * cercati in like tramite l'email
     */
    search = asyncHandler(async (req, res) => {
        const { email } = req.params;
        // -- ottengo la lista degli utenti
        const users = await this.service.search(email);
        // -- restituisco la lista
        res.status(200).json(users);
    });
    /**
     * Invia una mail con il codice di verifica
     * @param {Request} req
     * @param {Response} res
     */
    sendEmailOTP = asyncHandler(async (req, res) => {
        const email = req.body.email;
        if (!email || !Validator.email(email))
            throw new CError("ValidationError", "No email provided", 422);
        // ---
        const code = Cripto.randomOTPCode();
        const request_id = `ear-${email}`; // ear = email auth request
        // -- controllo che non sia gia stata fatta una richiesta
        if (RamDB.get(request_id))
            throw new CError(
                "RequestError",
                "There's another active request, try again later",
                400
            );
        // -- salvo nel ramdb
        const saltedHash = Cripto.salting(code);
        // memorizzo il codice hashato con salt con hmac
        const db_data = [
            saltedHash,
            0, // tentativi
            email,
        ];
        const is_set = RamDB.set(request_id, db_data, 120);
        if (!is_set) throw new Error("Not able to generate verification code");
        // Genero e invio la mail
        const { text, html } = automatedEmails.otpCode({ email, code });
        const is_send = await Mailer.send(
            email,
            "Vortex Verification Code",
            text,
            html,
        );
        if (!is_send) throw new Error("Not able to send the email");
        // ---
        res.status(201).json({ request_id });
    });
    /**
     * Verifica un email
     */
    verifyAccount = asyncHandler(async (req, res) => {
        const { email } = req.user;
        if (!email) throw new CError("", "Email not found", 404);
        // ---
        const [affected] = await this.service.updateUser(
            { email },
            { verified: true }
        );
        if (affected > 1) throw new Error("Updated multiple emails");
        // ---
        res.status(200).json({ message: "Account verified" });
    });
    /**
     * Just a test
     */
    testEmailOtp = asyncHandler(async (req, res) => {
        res.status(200).json({ message: "Valid" });
    });
    /**
     * Verifica la validità di un message authentication code
     */
    verifyMessageAuthenticationCode = asyncHandler(async (req, res) => {
        const { email, token } = req.body; // mac = message_authentication_code
        // -- verifico che ci siano i dati
        if (!email)
            throw new CError("", "No email passed for verification", 422);
        // ---
        const status = Mailer.verifyMessageAuthenticationCode(email, token);
        status.info = "1 codice e data validi, 2 codice valido ma scaduto, 3 codice non valido, 4 ricevente diverso da quello indicato";
        res.status(200).json(status);
    });
    /**
     * (DEV) genera e restituisce un message authentication code
     */
    createMessageAuthenticationCode = asyncHandler(async (req, res) => {
        if (!Config.DEV) throw new CError('', 'Access denied.', 403);
        // ---
        const { email } = req.body;
        if (!email) throw new CError('', 'Access denied.', 400);
        // ---
        const mac = Mailer.messageAuthenticationCode(email);
        res.status(200).json({ token: mac });
    });
    /**
     * Imposta nei cookie l'access e il refresh token
     * @param {Response} res
     * @param {Object} cookies
     * @param {*} [cookies.access_token]
     * @param {*} [cookies.refresh_token]
     * @param {*} [cookies.cke]
     */
    setTokenCookies = (res, cookies) => {
        if (cookies.access_token) {
            res.cookie("access_token", cookies.access_token, {
                httpOnly: true,
                secure: true,
                maxAge: JWT.access_token_cookie_lifetime,
                sameSite: "Strict",
                path: "/", // disponibile per tutte le route
            });
        }
        if (cookies.refresh_token) {
            res.cookie("refresh_token", cookies.refresh_token, {
                httpOnly: true,
                secure: true,
                maxAge: JWT.refresh_token_cookie_lifetime,
                sameSite: "Strict",
                path: "/auth",
            });
        }
        if (cookies.uid) {
            res.cookie("uid", cookies.uid, {
                httpOnly: true,
                secure: true,
                maxAge: JWT.access_token_cookie_lifetime,
                sameSite: "Strict",
                path: "/auth/passkey",
            });
        }
    };
}
