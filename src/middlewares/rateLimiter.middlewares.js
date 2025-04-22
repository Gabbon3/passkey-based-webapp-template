import { asyncHandler } from "./asyncHandler.middleware.js";
import { CError } from "../helpers/cError.js";
import { RamDB } from "../utils/ramdb.js";
import { Config } from "../serverConfig.js";

/**
 * Rate Limiter per l'email
 * 5 tentativi ogni 15 minuti
 */
export const emailRateLimiter = asyncHandler(async (req, res, next) => {
    const email = req.body.email?.toLowerCase();
    if (!email) throw new CError('', 'Email is required', 400);
    // ---
    const key = `login-attempts-${email}`;
    const attempts = RamDB.get(key) || 0;
    // ---
    if (attempts >= Config.TRLEMAIL) throw new CError('', 'Too many requests', 429);
    // -- aggiorno i tentativi
    RamDB.set(key, attempts + 1, 15 * 60);
    // ---
    next();
});