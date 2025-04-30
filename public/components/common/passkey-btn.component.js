import { LocalStorage } from "../../utils/local.js";
import { Log } from "../../utils/log.js";

export class PasskeyBtn extends HTMLElement {
    static counter = 1;
    constructor() {
        super();
    }

    connectedCallback() {
        // ---
        const icon = this.getAttribute("icon") ?? "passkey";
        const btn_class = this.getAttribute("b-class") ?? "primary";
        const text_content = this.textContent || "Authorize";
        const button_id = "pskbtn-" + PasskeyBtn.counter;
        PasskeyBtn.counter++;
        // -- imposto le proprietà
        this.className += ` btn ${btn_class}`;
        this.id = button_id;
        // -- HTML
        this.innerHTML = `<span class="material-symbols-rounded">${icon}</span>${text_content}`;
    }

    static pre_callback = {
        /**
         * DELETE ACCOUNT
         */
        'deleteaccount': async () => {
            if (!confirm('Are you sure you want to delete your account?')) return false;
            return true;
        },
    }

    static callbacks = {
        /**
         * AVVIO ADVANCED SESSION
         */
        'sudosession': async () => {
            Log.summon(0, 'Advanced session started');
            const expire = new Date(Date.now() + 45 * 60 * 1000);
            await LocalStorage.set("session-expire", expire);
            await LocalStorage.set("sudo-expire", expire);
        },
        /**
         * DELETE ACCOUNT
         */
        'deleteaccount': async () => {
            localStorage.clear();
            sessionStorage.clear();
            Log.summon(0, "Your account has been deleted, you will be disconnected from this page in a moment.");
            setTimeout(() => {
                window.location.href = '/signin';
            }, 3000);
        },
        /**
         * PASSKEY TEST
         */
        'passkeytest': async () => {
            Log.summon(0, "Passkey test performed successfully");
        }
    };
}

customElements.define("passkey-btn", PasskeyBtn);
