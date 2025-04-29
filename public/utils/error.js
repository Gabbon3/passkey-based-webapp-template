import { Log } from "./log.js";

export class CError {
    /**
     * Verifica un errore stampando un log all'utente
     * @param {Object} error - Oggetto di errore
     * @param {number} error.status - Codice di stato della risposta
     * @param {string} error.status_text - Testo dello stato della risposta
     * @param {string} error.error - Messaggio di errore della risposta
     * ---
     * @param {number} [lvl=2] - Livello di errore del log html 
     */
    static check(error, lvl = 2) {
        Log.summon(lvl, `${error.status} - ${error.error}`);
    }
}