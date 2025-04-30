import { API } from "../../utils/api.js";
import { LocalStorage } from "../../utils/local.js";
import { Log } from "../../utils/log.js";

class EmailVerifyBtn extends HTMLElement {
    static counter = 1;
    constructor() {
        super();
        // usato per inserire l'id request direttamente dopo la richiesta
        this.request_id_input = null;
        this.button = null;
        this.target = null; // l'input in cui verrà inserito il codice
        this.email = null; // input dove recuperare l'email
        this.timeout = 60 * 1000; // tempo di disabilitazione degli input
    }

    connectedCallback() {
        // -- variabili
        const icon = this.getAttribute('icon') ?? 'send';
        const target_id = this.getAttribute('target-id');
        const email_id = this.getAttribute('email-id') ?? null;
        const text_content = this.getAttribute('text-content') ?? 'Send code';
        const request_id_input = 'ear' + EmailVerifyBtn.counter; // email auth request
        const button_id = 'earbtn' + EmailVerifyBtn.counter;
        EmailVerifyBtn.counter++;
        // -- HTML
        this.innerHTML = `<button type="button" id="${button_id}" class="btn primary">
            <span class="material-symbols-rounded">${icon}</span>
            ${text_content}
        </button>
        <input type="text" name="request_id" id="${request_id_input}" style="display: none">`;
        // -- ELEMENTI
        document.addEventListener('DOMContentLoaded', () => {
            this.request_id_input = document.getElementById(request_id_input);
            this.target = document.getElementById(target_id);
            if (email_id) this.email = document.getElementById(email_id);
            this.target.disabled = true;
            this.button = document.getElementById(button_id);
            // -- EVENTI
            // -- pulsante invia richiesta
            this.button.addEventListener('click', this.send_email.bind(this));
        });
    }
    /**
     * Invia una richiesta di verifica della mail e imposta il codice della richiesta in automatico
     * all'input target definito
     * @param {string} email 
     * @returns 
     */
    async send_email() {
        this.button.disabled = true;
        // ---
        const email = this.email ? this.email.value : await LocalStorage.get('email-utente');
        // ---
        const res = await API.fetch('/api/auth/otp', {
            method: "POST",
            body: { email }
        });
        if (!res) {
            this.button.disabled = false;
            return;
        }
        Log.summon(0, "Email sent, check your inbox");
        // ---
        const { request_id } = res;
        this.request_id_input.value = request_id;
        // -- disabilito e riabilito poi il buttone e l'input
        this.target.disabled = false;
        setTimeout(() => {
            this.button.disabled = false;
            this.target.disabled = true;
        }, this.timeout);
    }
}

customElements.define("email-verify-btn", EmailVerifyBtn);