import { Form } from "../../utils/form.js";
import { LocalStorage } from "../../utils/local.js";
import { Log } from "../../utils/log.js";
import { API } from "../../utils/api.js";
import { date } from "../../utils/date.util.js";
import { Windows } from "../../utils/windows.js";
import { PasskeyService } from "../../services/passkey.public.service.js";

class ToolsComponent extends HTMLElement {
    static default_sections = [
        "activate-new-passkey",
        "message-authentication-code",
        "app-theme",
        "delete-account",
    ];

    constructor() {
        super();
        this.initialized = false;
        this.sections = {};
        this.events = {
            "activate-new-passkey": () => {
                /**
                 * 
                 */
                Form.register("form-activate-new-passkey", async (form, elements) => {
                    const email = await LocalStorage.get('user-email');
                    if (!email) return Log.summon(1, 'No email provided');
                    // ---
                    const { request_id, code } = elements;
                    // ---
                    Windows.loader(true);
                    const authenticated = await PasskeyService.activateNewPasskey(
                        email,
                        request_id,
                        code
                    );
                    if (authenticated) {
                        form.reset();
                        Log.summon(0, `New passkey added for the account ${email}`);
                    }
                    Windows.loader(false);
                });
            },
            "message-authentication-code": () => {
                /**
                 * CHECK MESSAGE AUTHENTICATION CODE
                 */
                Form.register("form-cmac", async (form, elements) => {
                    const { code } = elements;
                    if (!code.includes("."))
                        return Log.summon(1, "Invalid format");
                    // -- email
                    const email = await LocalStorage.get("email-utente");
                    // ---
                    const res = await API.fetch("/auth/vmac", {
                        method: "POST",
                        body: { email, mac: code.trim() },
                        loader: true,
                    });
                    const { status, timestamp } = res;
                    // -- creo il report
                    const icon = [
                        "check",
                        "delete_history",
                        "warning",
                        "warning",
                    ][status - 1];
                    const type = ["success", "warning", "danger", "danger"][
                        status - 1
                    ];
                    const title = [
                        "Valid",
                        "Expired",
                        "Not valid",
                        "Not yours",
                    ][status - 1];
                    const message = [
                        "~",
                        "This token is valid but expired",
                        "This token does not come from us, be careful",
                        "This token is valid but was not generated for you, someone may have tried to use their (valid) one to cheat you, be careful",
                    ][status - 1];
                    let report = `<div class="mt-2 alert ${type} monospace">
                    <div class="flex d-column gap-75">
                        <strong title="Status" class="flex y-center gap-75"><span class="material-symbols-rounded">${icon}</span> <span>${title}</span> </strong>
                        <div title="Message" class="flex y-center gap-75"><span class="material-symbols-rounded">info</span> <span>${message}</span> </div>
                        <div title="Issued on" class="flex y-center gap-75"><span class="material-symbols-rounded">today</span> <span>${date.format(
                            "%d %M %Y at %H:%i",
                            new Date(timestamp)
                        )}</span> </div>
                    </div></div>`;
                    // ---
                    document.getElementById("cmac-result").innerHTML = report;
                });
            },
        };
    }
    /**
     * Inizializza gli eventi associati alle sezioni se presenti
     */
    init_events() {
        for (const section in this.sections) {
            if (this.events[section]) this.events[section]();
        }
    }

    connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;
        // ---
        // se 'revert' allora nascondo tutte le sezioni di default
        const hide_all_sections = this.getAttribute("revert") ? false : true;
        // per ogni sezione disponibile verifico se sono state passate proprietà di visualizzazione custom
        // ad esempio potrebbe essere che il delete-account sia impostato su false, cosi lo prendo
        for (let section of ToolsComponent.default_sections) {
            const attribute = this.getAttribute(section);
            this.sections[section] = attribute
                ? JSON.parse(attribute)
                : hide_all_sections;
        }
        // passo le sezioni da mostrare o no se ce ne sono e renderizzo il componente
        this.innerHTML = this.render();
        // inizializzo gli eventi per ultimo, dopo il render
        this.init_events();
    }
    /**
     * Genera html per la finestra delle impostazioni
     * @param {Object} sections default tutte su true
     * @returns {string} html della finestra di settings
     */
    render(sections = this.sections) {
        let html = `
        <div class="window m pl" id="win-settings">
        <div class="flex y-center maincolor blue">
            <h2 class="icon mb-0">
                <span class="material-symbols-rounded">handyman</span>
                Tools
            </h2>
            <button class="btn t close l last" data-target-close="win-settings">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        `;
        // Attivazione nuova passkey
        if (sections["activate-new-passkey"]) {
            html += `
        <!-- ACTIVATE NEW PASSKEY -->
        <hr>
        <div class="maincolor red">
            <h3 class="icon slider" slider="cont-activate-new-passkey">
                <span class="material-symbols-rounded">passkey</span>
                New Passkey
            </h3>
            <div class="isle bg-4 slider-cont maincolor red" id="cont-activate-new-passkey">
                <form id="form-activate-new-passkey">
                    <mfa-input input-id="fanp-otp" class="mb-2"></mfa-input>
                    <email-verify-btn target-id="fanp-otp"></email-verify-btn>
                    <hr>
                    <button type="submit" class="btn primary mt-2">
                        <span class="material-symbols-rounded">passkey</span>
                        Activate
                    </button>
                </form>
            </div>
        </div>
        `;
        }
        // Message authentication code
        if (sections["message-authentication-code"]) {
            html += `
            <!-- CHECK MESSAGE AUTHENTICATION CODE -->
        <hr>
        <div class="maincolor olivegreen">
            <h3 class="icon slider" slider="cont-cmac">
                <span class="material-symbols-rounded">mark_email_read</span>
                Check Message Authentication Code
            </h3>
            <div class="isle bg-4 slider-cont maincolor olivegreen" id="cont-cmac">
                <p class="m-0 mb-3">
                    Here you can check the validity of the message authentication codes 
                    in the emails you receive from us, which is useful for verifying 
                    whether the emails actually come from us or are instead phishing 
                    attempts.
                </p>
                <form id="form-cmac">
                    <label for="cmac-code">
                        <span class="material-symbols-rounded">password</span>
                        Message Authentication Code
                    </label>
                    <div class="flex gap-75">
                        <input name="code" type="text" class="input-text mono" id="cmac-code" autocomplete="off" placeholder="**.**.******" required>
                        <btn-paste target="cmac-code"></btn-paste>
                    </div>
                    <div class="flex gap-50">
                        <button type="submit" class="btn primary mt-2">
                            <span class="material-symbols-rounded">check</span>
                            Check
                        </button>
                        <button type="reset" class="btn secondary CA mt-2">
                            <span class="material-symbols-rounded">close</span>
                            Reset
                        </button>
                    </div>
                </form>
                <div id="cmac-result"></div>
            </div>
        </div>
        `;
        }
        // Tema app
        if (sections["app-theme"]) {
            html += `
            <hr>
        <!-- TEMA APP -->
        <div class="maincolor blue">
            <h3 class="icon slider" slider="cont-theme">
                <span class="material-symbols-rounded">palette</span>
                Theme
            </h3>
            <div class="isle bg-4 slider-cont fast" data-open="false" id="cont-theme">
                <p class="m-0 mb-2">
                    Change the color scheme.
                </p>
                <select id="theme-selector" class="input-text monospace">
                    <option disabled>Dark Theme</option>
                    <option value="earth" selected>🌍 Earth</option>
                    <option value="monokai">🌙 Monokai</option>
                    <option value="dracula">🧛‍♂️ Dracula</option>
                    <option value="tokyonight">🌆 Tokyo Night</option>
                    <option value="cyberpunk">🚀 Cyber Punk</option>
                    <option value="coffee">☕ Coffee</option>
                    <option value="blossom">🌸 Blossom</option>
                    <option value="ocean">🌊 Ocean</option>
                    <option disabled>Light Theme</option>
                    <option value="cloud">☁️ Cloud</option>
                </select>
            </div>
        </div>
        `;
        }
        html += `<hr>
        <!-- ---- -->
        <div class="flex gap-50">
            ${
                sections["delete-account"]
                    ? `<button class="btn danger open" data-target-open="win-delete-account">
                <span class="material-symbols-rounded">delete_forever</span>
                Delete Account
            </button>`
                    : ""
            }
            <logout-btn class="btn warning ${
                sections["delete-account"] ? "last" : ""
            }"></logout-btn>
        </div>`;
        return html;
    }
}

customElements.define("app-tools", ToolsComponent);
