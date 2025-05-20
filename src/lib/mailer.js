import nodemailer from 'nodemailer';
import { Cripto } from '../utils/cripto.util.js';
import { Bytes } from '../utils/bytes.util.js';
import { BaseConverter } from '../utils/baseConverter.util.js';
import { Config } from '../serverConfig.js';

export class Mailer {
    /**
     * Configurazione per il trasporto
     */
    static transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: Config.EMAIL_USER,
            pass: Config.EMAIL_PASSWORD,
        }
    });
    /**
     * Genera una stringa univoca derivata da una mail
     * @param {string} email 
     * @param {boolean} [truncate=false] se true tronca l'hash dell email
     * @param {Uint8Array} [salt=null] se presente un salt, verrà concatenato all'email da hashare
     * @returns {string} restituisce una stringa che identifica una email pronta da usare per il mac
     */
    static async getHashEmailIdentity(email, truncate = false, salt = null) {
        // --
        const emailBytes = new TextEncoder().encode(email);
        // -- preparo il contenuto da hashare
        const prepare = salt instanceof Uint8Array ? Bytes.merge([emailBytes, salt], 8) : emailBytes;
        // -- effettuo l'hash
        const cripto = new Cripto();
        const hash = await cripto.hash(prepare, { algorithm: 'sha256' });
        // -- effettuo il troncamento se richiesto
        const result = !truncate ? Bytes.base62.encode(hash) : cripto.truncateBuffer(hash, 12, 'smart');
        // -- restituisco in base 62
        return Bytes.base62.encode(result);
    }
    /**
     * Genera un codice di verifica da includere nelle mail per legittimare la mail
     * @param {string} email_
     * @returns {string}
     */
    static async messageAuthenticationCode(email_) {
        const email = await this.getHashEmailIdentity(email_, true, Config.FISH_SALT);
        let timestamp = Math.floor(Date.now() / 1000);
        // -- comprimo e riduco la dimensione dei dati
        timestamp = BaseConverter.toString(timestamp, 62);
        // ---
        const payload = `${email}.${timestamp}`;
        const cripto = new Cripto();
        const signature = await cripto.hmac(payload, Config.FISH_KEY);
        // ---
        const encoded_signature = Bytes.base62.encode(signature.subarray(0, 16), true);
        return `${payload}.${encoded_signature}`;
    }
    /**
     * Verifica la validità di un codice di verifica anti phishing
     * @param {string} email 
     * @param {string} code 
     * @returns {number} 1 codice e data validi, 2 codice valido ma scaduto, 3 codice non valido, 4 ricevente diverso da quello indicato
     */
    static async verifyMessageAuthenticationCode(email, code) {
        const code_parts = code.split('.');
        const length = code_parts.length;
        // -- ottengo e decodifico la firma in binario (ultimo elemento)
        const encoded_signature = Bytes.base62.decode(code_parts[length - 1]);
        // -- ottengo il timestamp per fare il confronto temporale (penultimo elemento)
        const timestamp = Number(BaseConverter.fromString(code_parts[length - 2], 62)) * 1000;
        // -- payload = user + timestamp ottenuto unendo il codice senza signature
        const payload = code_parts.slice(0, -1).join('.');
        // -- ottengo il mittente (unendo le parti del codice senza timestamp e signature) e derivo l'id dell'email fornita
        const receiver = code_parts.slice(0, -2).join('.');
        const email_id = await this.getHashEmailIdentity(email, true, Config.FISH_SALT);
        // -- calcolo nuovamente la signature
        const cripto = new Cripto();
        const signature = await cripto.hmac(payload, Config.FISH_KEY);
        // -- verifico le condizioni
        const valid_signature = Bytes.compare(signature.subarray(0, 16), encoded_signature);
        const valid_date = Date.now() < new Date(timestamp + (24 * 60 * 60 * 1000));
        /**
         * se la firma è corretta ma il destinatario non corrisponde (codice 4)
         * se la firma è valida, verifico se la data è valida:
         *  - se si il token è valido (codice 1)
         *  - se no token scaduto (ma comunque valido) (codice 2)
         * se la firma non è valida, il token non è valido (codice 3)
         */
        const status = email_id !== receiver && valid_signature ? 4 :
            valid_signature ? (valid_date ? 1 : 2) : 3;
        return { status, timestamp };
    }
    /**
     * Invia una mail
     * @param {string} to 
     * @param {string} subject 
     * @param {string} text 
     * @returns {{status: boolean, message?: string, error?:string}}
     * @example
     * await Mailer.send(
     *   "destinatario@example.com",
     *   "Oggetto dell'email",
     *   "Ciao, questa è un'email di test inviata con Nodemailer!"
     * );
     */
    static async send(to, subject, text, html) {
        if (Config.DEV) {
            console.log(`\n\n ${subject} \n --- \n ${text} \n --- \n`);
            return true;
        }
        try {
            const mail_options = {
                from: Config.EMAIL_USER,
                to,
                subject,
                text,
                html
            };
            const info = await this.transporter.sendMail(mail_options);
            return { status: true, message: info.response };
        } catch (error) {
            console.warn("MAIL ERROR: ", error);
            return { status: false, error: error.message };
        }
    }
}