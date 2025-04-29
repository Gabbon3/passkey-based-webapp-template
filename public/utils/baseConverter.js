export class BaseConverter {
    static chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    
    /**
     * Converte un BigInt in una stringa rappresentativa nella base specificata.
     * @param {BigInt} n il numero da convertire
     * @param {number} b la base in cui convertire (2 -- 62)
     * @returns {string} la rappresentazione nella base specificata
     */
    static to_string(n, b) {
        n = BigInt(n);
        if (b < 2 || b > 62) throw new Error("2 < b < 62!");
        if (n === 0n) return '0';
        // ---
        b = BigInt(b);
        let result = '';
        let negativo = n < 0n;
        n = negativo ? -n : n;
        // ---
        while (n > 0n) {
            result = BaseConverter.chars[n % b] + result;
            n = n / b;
        }
        // ---
        return (negativo ? '-' : '') + result;
    }
    
    /**
     * Converte una stringa rappresentante un numero in una base specifica in un numero decimale.
     * @param {string} s - La stringa da convertire, che deve contenere solo caratteri validi per la base specificata.
     * @param {number} base - La base in cui è rappresentato il numero (deve essere compresa tra 2 e 62).
     * @returns {BigInt} - Il numero decimale corrispondente alla stringa fornita.
     * @throws {Error} - Se la base è al di fuori dell'intervallo consentito (2-62) o se la stringa contiene caratteri non validi.
     */
    static from_string(s, b) {
        if (b < 2 || b > 62) throw new Error("2 < b < 62!");
        // ---
        let result = 0n;
        let negativo = s[0] === '-';
        s = negativo ? s.slice(1) : s;
        // ---
        for (const char of s) {
            const digit = this.chars.indexOf(char);
            if (digit === -1 || digit >= b) throw new Error(`Carattere invalido "${char}" per la base ${b}`);
            result = result * BigInt(b) + BigInt(digit);
        }
        // ---
        return negativo ? -result : result;
    }
}

// window.BaseConverter = BaseConverter;