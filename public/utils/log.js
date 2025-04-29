export class Log {
    static initialized = false;
    static container = null;
    /**
     * Inizializza
     */
    static init() {
        if (this.initialized) return;
        this.container = document.querySelector("#logs_container");
        this.initialized = true;
    }
    /**
     * Genera un nuovo log da mostrare all'utente
     * @param {number} lvl 0 success, 1 warning, 2 error, 3 info
     * @param {string} msg messaggio di errore
     * @param {Function|null} [callback_onclick=null] funzione che viene eseguita al click sul log
     */
    static summon(lvl = 0, msg = "", callback_onclick = null) {
        const log = document.createElement("log-info");
        log.setAttribute("lvl", lvl);
        log.setAttribute("msg", msg);
        this.container.appendChild(log);
        // Se è stata definita una funzione di callback al click la eseguo
        if (callback_onclick instanceof Function) {
            log.addEventListener('click', async () => {
                await callback_onclick();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', Log.init());

window.Log = Log;