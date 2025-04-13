import { Request, Response, NextFunction } from 'express';
import { Roles } from "../../config/roles.js";
import { JWT } from "../../utils/jwt.util.js";
import { JwtPayload } from 'jsonwebtoken';

/**
 * Estendo Request, per aggiungere la proprietà 'user'
 */
declare global {
    namespace Express {
        interface Request {
            user?: any
        }
    }
}

/**
 * Middleware per la verifica del jwt e refresh 
 * dell'access token se scaduto
 * @param requiredRole
 */
export const verifyAccessToken = (requiredRole: number = Roles.BASE) => (req: Request, res: Response, next: NextFunction) => {
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
export const verifyEmailCode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { request_id: requestId, code }: { request_id: string; code: string } = req.body;

    const record = RamDB.get(requestId);
    
    // Se il codice è scaduto
    if (!record) {
        throw new CError("TimeoutError", "Request expired", 404);
    }

    const [saltedHash, attempts, email]: [Uint8Array | false, number, string] = record;

    // Troppi tentativi falliti
    if (attempts >= 3) {
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;

        const { text, html } = automatedEmails.otpFailedAttempt({ 
            email,
            ip_address: ipAddress,
        });

        await Mailer.send(email, "OTP Failed Attempt", text, html);
        RamDB.delete(requestId);

        throw new CError("", "Maximum attempts achieved", 429);
    }

    // Se saltedHash non è valido
    if (saltedHash === false) {
        throw new Error("InternalError: Invalid salted hash.");
    }

    // Verifica il codice
    const isValid = Cripto.verifySalting(code, saltedHash);

    if (!isValid) {
        RamDB.update(requestId, [saltedHash, attempts + 1, email]);
        throw new CError("AuthError", "Invalid code", 403);
    }

    // Assegna l'email all'utente autenticato
    (req as any).user = { email };

    // RamDB.delete(requestId); // Decommenta se vuoi eliminarlo dopo la verifica

    next();
});