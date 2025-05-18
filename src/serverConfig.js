import 'dotenv/config';

export class Config {
    // Server
    static PORT = process.env.PORT;

    // Database
    static DB_HOST = process.env.DB_HOST;
    static DB_NAME = process.env.DB_NAME;
    static DB_USER = process.env.DB_USER;
    static DB_PASSWORD = process.env.DB_PASSWORD;

    // Mail
    static EMAIL_USER = process.env.EMAIL_USER;
    static EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

    // Anti phishing
    static FISH_KEY = process.env.FISH_KEY;
    static FISH_SALT = process.env.FISH_SALT;

    // Passkeys
    static ORIGIN = process.env.ORIGIN;
    static RPID = process.env.RPID;

    // SHIV
    static SHIVPEPPER = Buffer.from(process.env.SHIVPEPPER, 'hex');

    // REDIS
    static REDIS_HOST = process.env.REDIS_HOST;
    static REDIS_PORT = process.env.REDIS_PORT;
    static REDIS_URL = process.env.REDIS_URL;

    // Dev
    static DEV = process.env.DEV === 'true';

    // Rate limiter email tentativi
    static TRLEMAIL = 5;
}