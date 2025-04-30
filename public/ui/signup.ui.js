import { AuthService } from "../services/auth.public.service.js";
import { Form } from "../utils/form.js";
import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";

document.addEventListener('DOMContentLoaded', async () => {
    /**
     * Form per l'accesso con OTP
     */
    Form.register('signup', async (form, elements) => {
        const { email, request_id, code } = elements;
        // ---
        Windows.loader(true);
        const registered = await AuthService.signup(email, request_id, code);
        if (registered) {
            form.reset();
            Log.summon(0, `Registered as ${email}`);
        }
        Windows.loader(false);
    });
});