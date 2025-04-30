import express from "express";
import { PasskeyController } from "../controllers/passkey.controller.js";
import { verifyAccessToken, verifyEmailCode } from "../middlewares/auth/auth.middlewares.js";
import { verifyPasskey } from "../middlewares/auth/passkey.middleware.js";
import rateLimit from "express-rate-limit";
import { Roles } from "../config/roles.js";
// -- router
const router = express.Router();
// -- controller
const controller = new PasskeyController();
// -- middlewares
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100, // massimo 10 richieste per 2 minuti
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * auth/passkey/*
 */
// -- START REGISTRATION
router.post('/register', verifyEmailCode, controller.startRegistration);
// -- COMPLETE REGISTRATION
router.post('/register', controller.completeRegistration);
router.get('/', controller.getAuthOptions);
// -- PASSKEY-LIST
router.get('/list', verifyAccessToken(), controller.list);
// -- RENAME
router.post('/rename/:id', verifyAccessToken(), controller.rename);
// -- DELETE
router.delete('/:id', verifyAccessToken(Roles.SUDO), controller.delete);
// -- test
router.post('/test', verifyPasskey(true), (req, res) => {
    res.status(200).json({ message: "Hi user " + req.user.uid });
});

export default router;