import { AuthService } from "../../services/auth.public.service.js";
import { Log } from "../../utils/log.js";
import { Windows } from "../../utils/windows.js";

class LogoutButton extends HTMLElement {
    constructor() {
        super();
    }

    render() {
        this.innerHTML = `<span class="material-symbols-rounded">logout</span>Sign-out`;
        this.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to sign out?')) return;
            // ---
            const signed_out = await AuthService.signout();
            if (signed_out) {
                Log.summon(0, 'Disconnected successfully, you will be redirected to sign-in page');
                Windows.loader(true);
                setTimeout(() => {
                    window.location.href = '/signin';
                }, 3000);
            }
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("logout-btn", LogoutButton);