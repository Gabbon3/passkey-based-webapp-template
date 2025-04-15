import nodemailer, { Transporter } from 'nodemailer';
import { Config } from '../serverConfig.js';

/**
 * Gestisce l'invio delle email tramite Nodemailer.
 */
export class Mailer {
    /**
     * Configurazione per il trasporto email.
     */
    static transporter: Transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: Config.EMAIL_USER,
            pass: Config.EMAIL_PASSWORD,
        }
    });

    /**
     * Invia una email.
     * @param to Indirizzo email del destinatario.
     * @param subject Oggetto dell'email.
     * @param text Testo in chiaro dell'email.
     * @param html Contenuto HTML dell'email.
     * @returns Oggetto con stato di invio e messaggio o errore.
     * @example
     * await Mailer.send(
     *   "destinatario@example.com",
     *   "Oggetto dell'email",
     *   "Ciao, questa è un'email di test inviata con Nodemailer!"
     * );
     */
    static async send(
        to: string,
        subject: string,
        text: string,
        html: string | null = null
    ): Promise<{ status: boolean; message?: string; error?: string }> {
        if (Config.DEV) {
            console.log(`\n\n ${subject} \n --- \n ${text} \n --- \n`);
            return { status: true, message: 'DEV mode: email not sent.' };
        }

        try {
            const mailOptions = {
                from: Config.EMAIL_USER,
                to,
                subject,
                text,
                html,
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { status: true, message: info.response };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn("MAIL ERROR: ", errorMessage);
            return { status: false, error: errorMessage };
        }
    }
}