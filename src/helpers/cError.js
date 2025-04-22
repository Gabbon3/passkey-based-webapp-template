export class CError extends Error {
    /**
     * Classe lanciabile tramite errore per errori gestiti
     * @param {string} name 
     * @param {string} message 
     * @param {number} [statusCode=500]
     */
    constructor(name, message, statusCode = 500) {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
    }
}