import { Log } from "../../utils/log.js";

export class BtnSimple extends HTMLElement {
    static types = {
        "copy": {
            "svg": "content_copy",
            "title": "Copy"
        },
        "paste": {
            "svg": "content_paste",
            "title": "Paste"
        }
    }

    constructor() {
        super();
        this.target = null;
        this.type = null;
    }

    connectedCallback() {
        this.type = this.getAttribute('type');
        const config = BtnSimple.types[this.type];
        // -- variables
        const target = this.getAttribute('target');
        this.className = `btn t CA ${this.className}`;
        const text = this.textContent;
        // -- title
        this.title = config.title;
        // -- html
        this.innerHTML = `${text}<span class="material-symbols-rounded">${config.svg}</span>`;
        // ---
        this.target = target;
    }

    static callbacks = {
        /****************
         *     COPY     *
         ****************/
        /**
         * COPIA CONTENUTO ELIMINANDO GLI SPAZI
         * @param {string} t
         */
        'copy_rmSpace': (t) => {
            return t.replaceAll(' ', '').trim();
        },
        /***************
         *    PASTE    *
         ***************/
        /**
         * incolla un codice a 6 cifre
         * @param {string} code 
         */
        'paste_mfa': (code) => {
            const formatted = code.replaceAll(' ', '').trim()
            if (formatted.length !== 6) {
                Log.summon(1, 'Invalid OTP');
                return '';
            }
            return formatted;
        }
    }

    static onclicks = {
        /**
         * Evento di click associato al copy
         * @param {HTMLElement} btn 
         * @returns {boolean}
         */
        'copy': (btn) => {
            const target = document.getElementById(btn.target);
            let content = target.value ?? target.textContent;
            // -- verifico se questo pulsante vuole elaborare il testo prima di restituirlo
            const callback = btn.getAttribute('callback');
            if (callback) {
                content = BtnSimple.callbacks[`${btn.type}_${callback}`](content);
            }
            // ---
            navigator.clipboard.writeText(content);
            return true;
        },
        /**
         * Evento di click associato al paste
         * @param {HTMLElement} btn 
         * @returns {boolean}
         */
        'paste': (btn) => {
            const target = document.getElementById(btn.target);
            const callback = btn.getAttribute('callback');
            // ---
            navigator.clipboard.readText().then((text) => {
                // -- callback
                if (callback) text = BtnSimple.callbacks[`${btn.type}_${callback}`](text);
                // ---
                target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ?
                    target.value = text :
                    target.textContent = text;
                // --- simulo l'evento
                const keyupevent = new KeyboardEvent('input', {
                    key: '',
                    bubbles: true,
                    cancelable: true,
                });
                // ---
                target.dispatchEvent(keyupevent);
            }).catch((error) => { console.warn(error) });
            return true;
        }
    }
}

customElements.define("btn-simple", BtnSimple);