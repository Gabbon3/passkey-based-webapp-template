import { AuthService } from "../services/auth.public.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { SessionStorage } from "../utils/session.js";
import { Windows } from "../utils/windows.js";

document.addEventListener('DOMContentLoaded', async () => {
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
            console.log(SessionStorage.get('key'), SessionStorage.get('counter'));
        }
        Windows.loader(false);
    });
});

class AuthUI {
    
}