class LogInfo extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // -- imposto livello e messaggio in base agli attributi
        const lvl = this.getAttribute("lvl") || "success";
        const msg = this.getAttribute("msg") || "";
        const icons = ["check", "priority_high", "close", "info_i" ];
        // -- imposto la struttura HTML interna del log
        this.classList.add("log", `_${lvl}`);
        this.innerHTML = `<div class="log-container">
            <div class="i-container">
                <span class="material-symbols-rounded">${icons[lvl]}</span>
            </div>
            <p>${msg}</p>
        </div>`;
        // -- rimuovo il log automaticamente dopo un certo periodo
        setTimeout(() => this.classList.add("chiudi"), 8000);
        setTimeout(() => this.remove(), 8500);
    }
}

customElements.define("log-info", LogInfo);