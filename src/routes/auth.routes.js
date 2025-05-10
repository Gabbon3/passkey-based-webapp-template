import express from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { verifyAuth, verifyEmailCode } from "../middlewares/auth/auth.middlewares.js";
import { verifyPasskey } from "../middlewares/auth/passkey.middleware.js";
import { emailRateLimiter } from "../middlewares/rateLimiter.middlewares.js";
// -- router
const router = express.Router();
// -- controller
const controller = new AuthController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * /auth/*
 */
// -- AUTH ROUTES (USER)
router.post('/signup', verifyEmailCode, controller.signup);
// sign in con email
router.post('/signin-e', emailRateLimiter, verifyEmailCode, controller.signin);
// sign in con passkey
router.post('/signin-p', verifyPasskey(), controller.signin);
router.post('/signout', verifyAuth({ checkIntegrity: false }), controller.signout);
// test per vedere se l'access token va
router.post('/test', verifyAuth(), (req, res, next) => {
    res.status(200).json({ message: "Lesgo" });
});

// EMAIL OTP
router.post('/otp', controller.sendEmailOTP);

export default router;