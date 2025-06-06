import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import { AuthService } from "../services/auth.service.js";
import { Cripto } from "../utils/cripto.util.js";
import { RedisDB } from "../lib/redisdb.js";
import { Mailer } from "../lib/mailer.js";
import { Validator } from "../utils/validator.util.js";
import automatedEmails from "../config/automatedMails.js";
import { SHIV } from "../protocols/SHIV.node.js";
import { ShivService } from "../services/shiv.service.js";

export class AuthController {
    constructor() {
        this.service = new AuthService();
        this.shivService = new ShivService();
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
        const { email, publicKey: publicKeyHex } = req.body;
        // ---
        if (!email) {
            throw new CError(
                "ValidationError",
                "Email is required",
                422
            );
        }
        // -- verifico se l'utente è già autenticato
        if (req.cookies.jwt) {
            // -- se si elimino dal db
            const kid = this.shivService.shiv.getKidFromJWT(req.cookies.jwt);
            if (kid) await this.shivService.delete({ kid }, true);
        }
        /**
         * Servizio
         */
        const { uid, jwt, publicKey: serverPublicKey, bypassToken } =
            await this.service.signin({
                request: req,
                email,
                publicKeyHex
            });
        // -- imposto l'access token nei cookies
        res.cookie("jwt", jwt, {
            httpOnly: true,
            secure: true,
            maxAge: SHIV.jwtLifetime * 1000,
            sameSite: "None",
            path: "/",
        });
        res.cookie("uid", uid, {
            httpOnly: true,
            secure: true,
            maxAge: SHIV.jwtLifetime * 1000,
            sameSite: "None",
            path: "/",
        });
        // Rate Limiter Email - rimuovo dal redis il controllo sui tentativi per accedere all'account
        await RedisDB.delete(`login-attempts-${email}`);
        // ---
        res.status(201).json({ jwt, publicKey: serverPublicKey, bypassToken });
    });

    /**
     * Effettua la disconnessione:
     * - elimina il cookie
     * - elimina l'auth key dal db
     */
    signout = asyncHandler(async (req, res) => {
        // -- elimino dal db
        this.service.signout(req.payload.kid);
        // ---
        res.clearCookie('jwt');
        res.clearCookie('uid');
        res.clearCookie('cke');
        // ---
        res.status(201).json({ message: 'Bye' });
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
        const cripto = new Cripto();
        const code = cripto.randomOTPCode();
        const request_id = `ear-${email}`; // ear = email auth request
        // -- controllo che non sia gia stata fatta una richiesta
        if (await RedisDB.get(request_id))
            throw new CError(
                "RequestError",
                "There's another active request, try again later",
                400
            );
        // -- salvo nel redis
        const saltedHash = cripto.salting(code);
        // memorizzo il codice hashato con salt con hmac
        const db_data = [
            saltedHash,
            0, // tentativi
            email,
        ];
        const is_set = await RedisDB.set(request_id, db_data, 120);
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
}
