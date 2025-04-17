import express from "express";
import { PasskeyController } from "../controllers/passkey.controller.js";
import { verify_access_token, verify_email_code } from "../middlewares/authMiddleware.js";
import { verify_passkey } from "../middlewares/passkey.middleware.js";
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
// -- auth/passkey
// -- START REGISTRATION
router.post('/register-e', verify_email_code, controller.start_registration);
router.post('/register-a', verify_access_token(Roles.SUDO), controller.start_registration);
// -- COMPLETE REGISTRATION
router.post('/register', controller.complete_registration);
router.get('/', controller.get_auth_options);
// -- PASSKEY-LIST
router.get('/list', verify_access_token(), controller.list);
// -- RENAME
router.post('/rename/:id', verify_access_token(), controller.rename);
// -- DELETE
router.delete('/:id', verify_access_token(Roles.SUDO), controller.delete);
router.post('/test', verify_passkey(true), (req, res) => {
    res.status(200).json({ message: "Hi user " + req.user.uid });
});

export default router;