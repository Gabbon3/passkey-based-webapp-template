class MfaInput extends HTMLElement {
    static id_counter = 0;

    constructor() {
        super();
    }

    connectedCallback() {
        // -- variables
        MfaInput.id_counter++;
        // -- label
        const label_text = this.getAttribute('label') ?? 'Code';
        const label_icon = this.getAttribute('label-icon') ?? 'password';
        // -- input
        const id = this.getAttribute('input-id') ?? `mfa-input-${MfaInput.id_counter}`;
        const name = this.getAttribute('name') ?? 'code';
        // -- html
        this.innerHTML = `<label for="${id}">
            <span class="material-symbols-rounded">${label_icon}</span>
            ${label_text}
        </label>
        <div class="flex gap-75">
            <input name="${name}" maxlength="6" type="text" pattern="\\d{6}" inputmode="numeric" class="input-text mfa" id="${id}" autocomplete="off" placeholder="******" required>
            <btn-simple type="paste" callback="mfa" target="${id}"></btn-simple>
        </div>`;
    }
}

customElements.define("mfa-input", MfaInput);