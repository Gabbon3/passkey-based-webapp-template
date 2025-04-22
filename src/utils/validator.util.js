export class Validator {
    /**
     * Valida se una stringa è un'email nel formato corretto.
     * @param {string} email - L'email da validare.
     * @returns {boolean} - Restituisce true se l'email è valida, false altrimenti.
     */
    static email(email) {
        // -- regex per validare l'email (per una validazione di base)
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }
}