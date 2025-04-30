import { LocalStorage } from "../utils/local.js";

export class ThemeUI {
    static selector = null;
    static initialized = false;
    /**
     * 
     */
    static async init() {
        if (this.initialized) return;
        // ---
        const localTheme = await LocalStorage.get("theme");
        this.selector = document.getElementById("theme-selector");
        // ---
        if (localTheme) document.body.className = "theme-" + localTheme;
        if (this.selector) {
            this.selector.addEventListener("change", async () => {
                await LocalStorage.set("theme", this.selector.value);
                document.body.className = "theme-" + this.selector.value;
            });
            this.selector.value = localTheme ?? 'earth';
        }
        // ---
        this.initialized = true;
    }
}