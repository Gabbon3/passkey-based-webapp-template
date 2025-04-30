// import { LocalStorage } from "../utils/local.js";

export class AppNavbarComponent extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        const path = window.location.pathname;
        // ---
        // <img src="./img/vortex_vault_logo.png" class="logo">
        /**
         * Chat rimossa:
        ${path !== '/chat' ? `<a href="/chat"' title="Chat">
            <span class="material-symbols-rounded">sms</span>
            <i>Chat</i>
        </a>` : ''}
         */
        this.innerHTML = `
        ${path ? `<a class="open blue" data-target-open="win-settings" title="Tools">
            <span class="material-symbols-rounded">handyman</span>
            <i>Tools</i>
        </a>` : ''}
        ${path === '/app' ? `<a class="open red" data-target-open="win-passkey" title="Passkey">
            <span class="material-symbols-rounded">passkey</span>
            <i>Passkey</i>
        </a>` : ''}

        ${path !== '/app' ? `<a title="App">
            <span class="material-symbols-rounded">home</span>
            <i>App</i>
        </a>` : ''}
        
        ${path !== '/signin' ? `<a href="/signin"' title="Sign In" class="mint last">
            <span class="material-symbols-rounded">login</span>
            <i>Sign In</i>
        </a>` : ''}

        ${path === '/signin' ? `<a title="Sign-in with Passkey" id="signin-passkey" class="red">
            <span class="material-symbols-rounded">passkey</span>
            <i>Sign-in with Passkey</i>
        </a>` : ''}
        ${path !== '/signup' && path !== '/vault' && path !== '/chat' ? `<a href="/signup"' title="Sign Up" class="mint last">
            <span class="material-symbols-rounded">person_add</span>
            <i>Sign Up</i>
        </a>` : ''}
        `;
    }
}
/*
${path ? `<a class="open orange" data-target-open="win-totp" title="Time-Based One-Time Password">
    <span class="material-symbols-rounded">phonelink_lock</span>
    <i>TOTP</i>
</a>` : ''}
*/
// -- registro il componente nei custom elements
customElements.define('app-navbar', AppNavbarComponent);