import express from "express";
import rateLimit from "express-rate-limit";
import { RefreshTokenController } from "../controllers/refreshToken.controller.js";
import { verifyAccessToken, verifyEmailCode } from "../middlewares/auth/auth.middlewares.js";
import { verifyPasskey } from "../middlewares/auth/passkey.middleware.js";
import { Roles } from "../config/roles.js";
// -- router
const router = express.Router();
// -- controller
const controller = new RefreshTokenController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * Queste routes si trovano sotto:
 * auth/refreshtoken
 */
// -- le routes con i controller associati
router.post('/refresh', verifyPasskey(), controller.generateAccessToken);
router.post('/rename', verifyAccessToken(), controller.rename);
router.post('/revoke', verifyAccessToken(Roles.SUDO), controller.revoke);
// -- device recovery
router.post('/unlock', verifyPasskey(), controller.unlock);
router.post('/unlockwithemail', verifyEmailCode, controller.unlock);
router.post('/revoke-all', verifyAccessToken(Roles.SUDO), controller.revokeAll);
router.get('/', verifyAccessToken(), controller.getAll);
router.delete('/:id', verifyAccessToken(Roles.SUDO), controller.delete);

export default router;