import { Roles } from "../../config/roles.js";
import { JWT } from "../../utils/jwt.util.js";
import { asyncHandler } from "../asyncHandler.middleware.js";
import { RamDB } from "../../utils/ramdb.js";
import { CError } from "../../helpers/cError.js";
import { Mailer } from "../../lib/mailer.js";
import { Cripto } from "../../utils/cripto.util.js";
import { SHIV } from "../../protocols/SHIV.node.js";
import { verifyPasskey } from "./passkey.middleware.js";

/**
 * Middleware di autenticazione e autorizzazione basato su JWT e controllo d'integrità opzionale.
 * => req.payload = payload { uid, role, kid }
 * @function verifyAccessToken
 * @param {Object} [options={}] - Opzioni per configurare il middleware.
 * @param {number} [options.requiredRole=Roles.BASE] - Ruolo minimo richiesto per accedere alla rotta.
 * @param {boolean} [options.checkIntegrity=true] - Se true, abilita la verifica dell'integrità tramite header 'X-Integrity'.
 * @returns {Function} Express middleware async che valida l'access token e opzionalmente verifica l'integrità.
 */
export const verifyAuth = (options = {}) => {
    const { requiredRole = Roles.BASE, checkIntegrity = true } = options;
    return async (req, res, next) => {
        const jwt = req.cookies.jwt;
        // -- verifico che esista
        if (!jwt) return res.status(401).json({ error: "Access denied" });
        // ---
        const shiv = new SHIV();
        // -- ottengo il kid
        const kid = shiv.getKidFromJWT(jwt);
        // ---
        const jwtSignKey = await shiv.getSignKey(kid, 'jwt-signing');
        if (!jwtSignKey)
            return res.status(401).json({ error: "Access denied" });
        // -- verifico che l'access token sia valido
        const payload = JWT.verify(jwt, jwtSignKey);
        if (!payload) return res.status(401).json({ error: "Access denied" });
        // -- se è tutto ok aggiungo il payload dell'utente alla request
        req.payload = payload;
        // -- verifica se il payload è conforme
        if (!req.payload.uid)
            return res.status(400).json({ error: "Sign-in again" });
        // -- verifica del ruolo
        if (req.payload.role < requiredRole)
            return res.status(403).json({ error: "Insufficient privileges" });
        /**
         * Verifico l'integrità della richiesta
         */
        if (checkIntegrity) {
            const integrity = req.get("X-Integrity");
            if (!integrity)
                return res.status(403).json({ error: "Integrity not found" });
            // -- verifico l'integrity
            const { kid } = payload;
            const verified = await shiv.verifyIntegrity(kid, integrity);
            // ---
            if (verified === -1)
                return res.status(404).json({ error: "Secret not found" });
            if (!verified)
                return res.status(403).json({ error: "Integrity failed" });
        }
        // -- passo al prossimo middleware o controller
        next();
    };
};

/**
 * Verifica un shiv privileged token
 * configura la proprietà req.ppt = payload del ppt
 */
export const verifyShivPrivilegedToken = asyncHandler(
    async (req, res, next) => {
        const ppt = req.cookies.ppt;
        const jwt = req.cookies.jwt;
        if (!ppt || !jwt)
            return res.status(401).json({ error: "Access denied" });
        // ---
        const shiv = new SHIV();
        // -- ottengo il kid
        let kid = null;
        try {
            kid = JSON.parse(atob(jwt.split(".")[1])).kid;
        } catch (error) {
            return res.status(401).json({ error: "Access denied" });
        }
        // ---
        const pptSignKey = await shiv.getSignKey(kid, 'ppt-signing');
        if (!pptSignKey)
            return res.status(401).json({ error: "Access denied" });
        // -- verifico che il ppt sia valido
        const payload = JWT.verify(ppt, pptSignKey);
        if (!payload) return res.status(401).json({ error: "Access denied" });
        // -- passo le informazioni
        req.ppt = payload;
        // -- passo al prossimo middleware o controller
        next();
    }
);

/**
 * Verifica il codice inviato per email.
 */
export const verifyEmailCode = asyncHandler(async (req, res, next) => {
    const { request_id: requestId, code } = req.body;
    const record = RamDB.get(requestId);
    // -- se il codice è scaduto
    if (!record) {
        throw new CError("TimeoutError", "Request expired", 404);
    }
    // -- recupero i dati
    const [saltedHash, attempts, email] = record;
    // -- verifico il numero di tentativi
    if (attempts >= 3) {
        await Mailer.send(
            email,
            "OTP Failed Attempt",
            "Maximum attempts achieved on OTP verification via another device"
        );
        RamDB.delete(requestId);
        throw new CError("", "Maximum attempts achieved", 429);
    }
    // -- se il codice non è valido
    if (saltedHash === false) {
        throw new Error("InternalError: Invalid salted hash.");
    }
    // -- verifica il codice
    const isValid = Cripto.verifySalting(code, saltedHash);
    if (!isValid) {
        // -- aumento il numero di tentativi
        RamDB.update(requestId, [saltedHash, attempts + 1, email]);
        throw new CError("AuthError", "Invalid code", 403);
    }
    // memorizzo l'utente che ha fatto la richiesta
    req.payload = { email };
    // -- elimino la richiesta dal db
    RamDB.delete(requestId);
    // -- se il codice è valido, passo al prossimo middleware
    next();
});

const authStrategies = {
    'psk': verifyPasskey,
    'otp': verifyEmailCode,
}

/**
 * Middleware per selezionare in automatico l'autenticatore da usare
 * @param {Array} allowedMethods - array dei metodi permessi -> psk (passkey), otp, psw (password)
 * @returns {Function}
 */
export const authSelector = (allowedMethods = []) => {
    return (req, res, next) => {
        const method = req.headers['x-authentication-method'];

        if (!method || !allowedMethods.includes(method)) {
            return res.status(400).json({ error: 'Auth method not allowed' });
        }

        const middleware = authStrategies[method];
        if (!middleware) {
            return res.status(400).json({ error: 'Not valid auth method' });
        }

        return middleware(req, res, next);
    };
};