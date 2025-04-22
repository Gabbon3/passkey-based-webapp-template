import { date } from "../utils/date.util.js";

const automatedEmails = {
    /**
     * Template wrapper base per email HTML
     * @param {string} content HTML principale del messaggio
     * @returns {string}
     */
    htmlWrapper(content) {
        return `
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 40px;">
  <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    ${content}
  </div>
</body>`},
    /**
     * Restituisce un colore casuale per colorare un po le mail
     * @returns {string}
     */
    getRandomColor() {
        return [
            '#738e54', // verde
            '#f4756a', // rosso
            '#e27a45', // arancione
            '#3392ff', // blu
            '#a566ff', // viola
        ][Math.floor(Math.random() * 5)];
    },
    /**
     * testo per il codice otp
     * @param {object} options 
     * @returns 
     */
    otpCode: ({ email, code }) => {
        // ---
        const text = code;
        // ---
        const html = `<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 40px;">
  <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); text-align: center;">
    <h2 style="color: #333;">Your verification code</h2>
    <p style="font-family: monospace;font-size: 36px; font-weight: bold; margin: 30px 0; color: ${automatedEmails.getRandomColor()};">${code}</p>
    <p style="color: #666; font-size: 16px;">
      Enter this code to complete the verification of your identity. The code is valid for the next 2 minutes.
    </p>
    <p style="color: #999; font-size: 14px; margin-top: 40px;">
      If you have not requested this code, you can ignore this email.
    </p>
  </div>
</body>`;
        // ---
        return { text, html };
    },

    /**
     * 
     * @param {object} options 
     * @returns 
     */
    newSignIn: ({ email, user_agent, ip_address }) => {
        const [browser, browser_version, os, os_version] = user_agent.split("-");

        const text =
            `Hello ${email.split("@")[0]},
We noticed that a new device attempted to sign-in to your account. Below are the details:

 - Device: ${os}
 - IP: ${ip_address}
 - Time: ${date.format("%d %M %Y at %H:%i")}

If it wasn't you, you can still rest assured since that device is locked, but you need to change your password immediately as your vault could be at risk.

The Vortex Vault team`;

        const htmlContent =
            `<h2 style="color: #333;">New sign-in detected</h2>
<p>We noticed that a new device attempted to sign in to your account. Below are the details:</p>
<ul style="padding-left: 20px; color: #444;">
  <li><strong>Device:</strong> ${os}</li>
  <li><strong>IP:</strong> ${ip_address}</li>
  <li><strong>Time:</strong> ${date.format("%d %M %Y at %H:%i")}</li>
</ul>
<p>If it wasn't you, don't worry — the device has been blocked. Still, change your password immediately to secure your account.</p>
<p style="color: #999;">The Vortex Vault team</p>`;

        const html = automatedEmails.htmlWrapper(htmlContent);

        return { text, html };
    },
    /**
     * Testo per la nuova Passkey aggiunta all'account
     * @param {string} email 
     * @returns 
     */
    newPasskeyAdded: (email) => {
        const text =
            `Hello ${email.split('@')[0]},
We noticed that a new passkey has been associated with your account. For more information, visit the app.

The Vortex Vault team`;

        const htmlContent = `
<h2 style="color: #333;">New passkey added</h2>
<p>We noticed that a new passkey has been associated with your account.</p>
<p>For more information, open the app and review your authentication settings.</p>
<p style="color: #999;">The Vortex Vault team</p>`;

        const html = automatedEmails.htmlWrapper(htmlContent);

        return { text, html };
    },

    /**
     * Avviso per tentativi OTP errati
     * @param {object} options
     * @returns
     */
    otpFailedAttempt: ({ email, ip_address }) => {
        const text =
            `Hello ${email.split("@")[0]},
We noticed several failed attempts to enter the OTP code for your account. Here are the details:

 - IP: ${ip_address}
 - Time: ${date.format("%d %M %Y at %H:%i")}

If you have not attempted to access your account, be aware that further attempts will be refused.

The Vortex Vault team`;

        const htmlContent =
            `<h2 style="color: #d35400;">Failed OTP attempts detected</h2>
<p>We noticed several failed attempts to enter the OTP code for your account. Here are the details:</p>
<ul style="padding-left: 20px; color: #444;">
  <li><strong>IP:</strong> ${ip_address}</li>
  <li><strong>Time:</strong> ${date.format("%d %M %Y at %H:%i")}</li>
</ul>
<p>If this wasn't you, don't worry — we blocked the attempts. However, monitor your account and consider changing your password.</p>
<p style="color: #999;">The Vortex Vault team</p>`;

        const html = automatedEmails.htmlWrapper(htmlContent);

        return { text, html };
    },
    /**
     * Text to notify the user that their account has been successfully deleted.
     * @param {object} options
     * @returns 
     */
    deleteAccount: ({ email }) => {
        const text =
            `Hello ${email.split("@")[0]},
We wanted to inform you that your account has been successfully deleted.

If this action was taken by you, no further action is required.

If you did not request account deletion, please contact our support team immediately to secure your account.

The Vortex Vault team`;

        const htmlContent =
            `<h2 style="color: #c0392b;">Account successfully deleted</h2>
<p>We wanted to inform you that your account has been successfully deleted.</p>
<p>If this action was taken by you, no further action is required.</p>
<p>If you did not request this, contact our support team immediately to secure your account.</p>
<p style="color: #999;">The Vortex Vault team</p>`;

        const html = automatedEmails.htmlWrapper(htmlContent);

        return { text, html };
    },
};

export default automatedEmails;
