class Footer extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.innerHTML = `
        <!-- container dei log -->
        <div id="logs_container"></div>

        <!-- modal backdrop -->
        <div id="modal-backdrop"></div>
        
        <!-- caricamento -->
        <div id="loader">
            <div class="full flex x-center y-center">
                <svg data-slot="icon" data-darkreader-inline-stroke="" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25">
                    </path>
                </svg>
            </div>
        </div>

        <!--
        QRCODE DISPLAY
        -->
        <div class="window auto" id="win-qrcode-display">
            <canvas id="qrcode-display"></canvas>
            <input type="text" class="none" id="qrcode-display-content">
            <btn-copy target="qrcode-display-content" class="primary w-100">
                Copy QR Code content
            </btn-copy>
        </div>
        `;
    }
}
// -- registro il componente nei custom elements
customElements.define('app-footer', Footer);