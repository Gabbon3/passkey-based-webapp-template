import 'dotenv/config';

export class Config {
    // Server
    static PORT: string | undefined = process.env.PORT;

    // JWT
    static ACCESS_TOKEN_SECRET: Buffer = Buffer.from(process.env.ACCESS_TOKEN_SECRET ?? '', 'hex');
    static PASSKEY_TOKEN_SECRET: Buffer = Buffer.from(process.env.PASSKEY_TOKEN_SECRET ?? '', 'hex');

    // Database
    static DB_HOST: string | undefined = process.env.DB_HOST;
    static DB_NAME: string | undefined = process.env.DB_NAME;
    static DB_USER: string | undefined = process.env.DB_USER;
    static DB_PASSWORD: string | undefined = process.env.DB_PASSWORD;

    // Mail
    static EMAIL_USER: string | undefined = process.env.EMAIL_USER;
    static EMAIL_PASSWORD: string | undefined = process.env.EMAIL_PASSWORD;

    // Passkeys
    static ORIGIN: string | undefined = process.env.ORIGIN;
    static RPID: string | undefined = process.env.RPID;

    // Dev
    static DEV: boolean = process.env.DEV === 'true';

    // Rate limiter email tentativi
    static TRLEMAIL: number = 5;
}