import express from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { verifyAccessToken, verifyEmailCode } from "../middlewares/auth/auth.middlewares.js";
import { verifyPasskey } from "../middlewares/auth/passkey.middleware.js";
import { emailRateLimiter } from "../middlewares/rateLimiter.middlewares.js";
import { Roles } from "../config/roles.js";
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
 * Queste routes stanno sotto:
 * /auth
 */
// -- AUTH ROUTES (USER)
router.post('/signup', verifyEmailCode, controller.signup);
router.post('/signin', emailRateLimiter, controller.signin);
// -- SEARCH
// router.get('/search/:email', verifyAccessToken(), controller.search);
// -- EMAIL CODES
router.post('/otp', controller.sendEmailOTP);
router.post('/otp-test', verifyEmailCode, controller.testEmailOtp);
// -- ACCOUNT VERIFY
router.post('/verify-account', verifyEmailCode, controller.verifyAccount);
// -- SIGN-OUT
router.post('/signout', verifyAccessToken(), controller.signout);
router.post('/clear-cookies', controller.clearCookies);
// -- DELETE
router.post('/delete', verifyPasskey(true), controller.delete);
// -- MESSAGE AUTHENTICATION CODE VERIFICATION
router.post('/vmac', controller.verifyMessageAuthenticationCode);
// -- (DEV) restituisce un message autentication code
router.get('/vmac/:email', controller.createMessageAuthenticationCode);

export default router;