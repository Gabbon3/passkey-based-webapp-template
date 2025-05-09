import { AuthService } from "../services/auth.public.service.js";
import { PasskeyService } from "../services/passkey.public.service.js";
import { Form } from "../utils/form.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";

document.addEventListener('DOMContentLoaded', async () => {
    SigninUI.init();
    /**
     * Form per l'accesso con OTP
     */
    Form.register('signin', async (form, elements) => {
        const { email, request_id, code } = elements;
        // ---
        Windows.loader(true);
        const authenticated = await AuthService.signin(email, request_id, code);
        if (authenticated) {
            form.reset();
            Log.summon(0, `Authenticated as ${email}`);
        }
        Windows.loader(false);
    });
    /**
     * Accesso con la passkey
     */
    document.querySelector('#signin-passkey').addEventListener('click', async (e) => {
        const email = await LocalStorage.get('user-email') ?? document.querySelector('#email').value;
        if (!email) {
            document.querySelector('#email').focus();
            return Log.summon(1, 'Insert your email into field.');
        }
        // ---
        const authenticated = await AuthService.signinWithPasskey(email);
        if (authenticated) Log.summon(0, `Authenticated as ${email}`);
    });
});

class SigninUI {
    /**
     * Inizializza l'interfaccia per il login
     */
    static async init() {
        const userEmail = await LocalStorage.get('user-email');
        if (userEmail) document.querySelector('#email').value = userEmail;
        // ---
    }
}