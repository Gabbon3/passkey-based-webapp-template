export class date {
    /**
     * Restituisce una stringa che rappresenta la data e l'ora formattate secondo un dato schema.
     *
     * @param {string} format - La stringa di formato da applicare alla data. Supporta i seguenti formati:
     *
     * - **Anno**
     *   - `Y`: Anno completo (es. `2024`)
     *   - `y`: Anno a due cifre (es. `24`)
     *
     * - **Mese**
     *   - `m`: Mese numerico con zero iniziale (es. `01` per Gennaio)
     *   - `n`: Mese numerico senza zero iniziale (es. `1` per Gennaio)
     *   - `M`: Abbreviazione inglese del mese (es. `Jan`)
     *   - `F`: Nome completo inglese del mese (es. `January`)
     *   - `t`: Numero di giorni nel mese (es. `28` a `31`)
     *
     * - **Giorno**
     *   - `d`: Giorno del mese con zero iniziale (es. `07`)
     *   - `j`: Giorno del mese senza zero iniziale (es. `7`)
     *   - `D`: Giorno della settimana abbreviato (es. `Mon`)
     *   - `l`: Giorno della settimana completo (es. `Monday`)
     *   - `w`: Giorno della settimana numerico (0 per Domenica, 6 per Sabato)
     *   - `N`: Numero ISO-8601 del giorno della settimana (1 per Lunedì, 7 per Domenica)
     *   - `S`: Suffisso ordinale inglese per il giorno (es. `st`, `nd`, `rd`, `th`)
     *   - `z`: Giorno dell'anno (es. `0` a `365`)
     *
     * - **Settimana**
     *   - `W`: Numero della settimana nell'anno (secondo lo standard ISO-8601, es. `01` a `53`)
     *
     * - **Ora**
     *   - `H`: Ora in formato 24 ore con zero iniziale (es. `00` a `23`)
     *   - `G`: Ora in formato 24 ore senza zero iniziale (es. `0` a `23`)
     *   - `h`: Ora in formato 12 ore con zero iniziale (es. `01` a `12`)
     *   - `g`: Ora in formato 12 ore senza zero iniziale (es. `1` a `12`)
     *   - `A`: AM o PM maiuscolo
     *   - `a`: am o pm minuscolo
     *
     * - **Minuti e Secondi**
     *   - `i`: Minuti con zero iniziale (es. `00` a `59`)
     *   - `s`: Secondi con zero iniziale (es. `00` a `59`)
     *
     * @param {Date} date
     * @returns {string} la data formattata come richiesto
     * 
     * @example
     * date.format('Y-m-d H:i:s'); // "2024-10-07 14:30:45"
     */
    static format(format, date = new Date()) {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
        const map = {
            // Anno
            Y: date.getFullYear(),
            y: String(date.getFullYear()).slice(-2),

            // Mese
            m: String(date.getMonth() + 1).padStart(2, "0"),
            n: date.getMonth() + 1,
            M: capitalize(date.toLocaleString("default", { month: "short" })),
            F: capitalize(date.toLocaleString("default", { month: "long" })),
            t: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),

            // Giorno
            d: String(date.getDate()).padStart(2, "0"),
            j: date.getDate(),
            D: capitalize(date.toLocaleString("default", { weekday: "short" })),
            l: capitalize(date.toLocaleString("default", { weekday: "long" })),
            w: date.getDay(),
            N: date.getDay() === 0 ? 7 : date.getDay(),
            S: (() => {
                const day = date.getDate();
                return ["th", "st", "nd", "rd"][
                    day % 10 > 3 || Math.floor((day % 100) / 10) === 1
                        ? 0
                        : day % 10
                ];
            })(),
            z: Math.floor(
                (date - new Date(date.getFullYear(), 0, 0)) / 86400000
            ),

            // Settimana
            W: (() => {
                const first_day_of_year = new Date(date.getFullYear(), 0, 1);
                const days = Math.floor((date - first_day_of_year) / 86400000);
                return String(
                    Math.ceil((days + first_day_of_year.getDay() + 1) / 7)
                ).padStart(2, "0");
            })(),

            // Ora
            H: String(date.getHours()).padStart(2, "0"),
            G: date.getHours(),
            h: String(date.getHours() % 12 || 12).padStart(2, "0"),
            g: date.getHours() % 12 || 12,
            A: date.getHours() < 12 ? "AM" : "PM",
            a: date.getHours() < 12 ? "am" : "pm",

            // Minuti e secondi
            i: String(date.getMinutes()).padStart(2, "0"),
            s: String(date.getSeconds()).padStart(2, "0"),
        };
        // ---
        return format.replace(/%(\w)/g, (match, p1) => map[p1] !== undefined ? map[p1] : match);
    }
}