import 'dotenv/config';

export class Config {
    // Server
    static PORT = process.env.PORT;

    // JWT
    static ACCESS_TOKEN_SECRET = Buffer.from(process.env.ACCESS_TOKEN_SECRET ?? '', 'hex');

    // Database
    static DB_HOST = process.env.DB_HOST;
    static DB_NAME = process.env.DB_NAME;
    static DB_USER = process.env.DB_USER;
    static DB_PASSWORD = process.env.DB_PASSWORD;

    // Mail
    static EMAIL_USER = process.env.EMAIL_USER;
    static EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

    // Passkeys
    static ORIGIN = process.env.ORIGIN;
    static RPID = process.env.RPID;

    // Dev
    static DEV = process.env.DEV === 'true';

    // Rate limiter email tentativi
    static TRLEMAIL = 5;
}