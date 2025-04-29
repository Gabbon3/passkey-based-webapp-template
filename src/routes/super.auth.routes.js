import express from "express";
import rateLimit from "express-rate-limit";
import { SuperAuthController } from "../controllers/super.auth.controller.js";
import { verifyAccessToken, verifyEmailCode } from "../middlewares/auth/auth.middlewares.js";
import { verifyPasskey } from "../middlewares/auth/passkey.middleware.js";
import { emailRateLimiter } from "../middlewares/rateLimiter.middlewares.js";
// -- router
const router = express.Router();
// -- controller
const controller = new SuperAuthController();
// -- rate Limiter per le auth routes
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too many requests, try later",
});
router.use(limiter);
/**
 * /auths/*
 */
// -- AUTH ROUTES (USER)
router.post('/signup', verifyEmailCode, controller.signup);
router.post('/signin', emailRateLimiter, controller.signin);
// EMAIL OTP
router.post('/otp', controller.sendEmailOTP);

export default router;