import { Roles } from "../../config/roles.js";
import { JWT } from "../../utils/jwt.util.js";
import { asyncHandler } from '../asyncHandler.middleware.js';
import { RamDB } from '../../utils/ramdb.js';
import { CError } from '../../helpers/cError.js';
import { Mailer } from '../../lib/mailer.js';
import { Cripto } from '../../utils/cripto.util.js';

/**
 * Middleware per la verifica del jwt e refresh 
 * dell'access token se scaduto
 * @param {number} requiredRole
 */
export const verifyAccessToken = (requiredRole = Roles.BASE) => (req, res, next) => {
    const accessToken = req.cookies.access_token;
    // -- verifico che esista
    if (!accessToken) {
        return res.status(401).json({ error: "Access denied" });
    }
    // -- verifico che l'access token sia valido
    const payload = JWT.verify(accessToken, 'default');
    if (!payload) {
        return res.status(401).json({ error: "Access denied" });
    }
    // -- se è tutto ok aggiungo il payload dell'utente alla request
    req.user = payload;
    // -- verifica se il payload è conforme
    if (!req.user.uid) {
        return res.status(400).json({ error: "Sign-in again." });
    }
    // -- verifica del ruolo
    if (req.user.role < requiredRole) {
        return res.status(403).json({ error: "Insufficient privileges" });
    }
    // -- passo al prossimo middleware o controller
    next();
}

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
        await Mailer.send(email, "OTP Failed Attempt", 'Maximum attempts achieved on OTP verification via another device');
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
    req.user = { email };
    // -- elimino la richiesta dal db
    RamDB.delete(requestId);
    // -- se il codice è valido, passo al prossimo middleware
    next();
});