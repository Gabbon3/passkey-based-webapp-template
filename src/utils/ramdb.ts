import msgpack from "msgpack-lite";

export class RamDB {
    static db = new Map();
    static max_ttl = 60 * 60 * 24; // 24 ore
    static cleanup_interval = 60 * 10 * 1000; // 10 minuti
    static cleanup = false;
    /**
     * Imposta un valore nel ramdb, serializzato con msgpack
     * ha una scadenza di default di 1 ora che non puo essere superata
     * @param key
     * @param value
     * @param ttl - seconds - 0 > ttl => 145440
     * @returns true se è stato settato
     */
    static set(key: string, value: any, ttl: number = 3600): boolean {
        // -- verifico se il ttl è stato disposto correttamente
        if (ttl < 0 || ttl > this.max_ttl) return false;
        let encoded_value = null;
        // -- prima provo a convertire
        try {
            encoded_value = msgpack.encode(value);
        } catch (error) {
            console.warn("RAMDB: Error while encoding " + key + error);
            return false;
        }
        // -- poi elimino il vecchio dato se si sta rimpiazzando
        if (this.has(key)) this.delete(key);
        // ---
        const expire = Date.now() + ttl * 1000;
        // -- memorizzo il dato
        this.db.set(key, [encoded_value, expire]);
        // ---
        return true;
    }
    /**
     * Verifica se un dato esiste nel db (verificando anche se non è scaduto)
     * @param key
     * @returns true se esiste
     */
    static has(key: string): boolean {
        const exist = this.db.has(key);
        if (!exist) return false;
        // -- se esiste verifico che non sia scaduta
        // -- se scaduta elimino e restituisco false
        const record = this.db.get(key);
        const expire = record[1];
        if (Date.now() > expire) {
            this.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Restituisce un valore dal ramdb
     * @param key 
     * @param ttl default false
     * @returns null se non ha trovato nulla
     */
    static get(key: string, ttl = false): any {
        const exist = this.has(key);
        if (!exist) return null;
        // ---
        const record = this.db.get(key);
        // ---
        try {
            const decoded_value = msgpack.decode(record[0]);
            return ttl ? [decoded_value, record[1]] : decoded_value;
        } catch (error) {
            console.warn("RAMDB: Error while decoding " + key + error);
            return false;
        }
    }
    /**
     * Aggiorna un elemento sul db
     * @param key 
     * @param updated_value 
     * @returns true se ha settato
     */
    static update(key: string, updated_values: any): boolean {
        const record = this.get(key, true);
        if (!record) return false;
        // ---
        const expire = record[1];
        // -- prima provo a serializzare
        let encoded_value = null;
        try {
            encoded_value = msgpack.encode(updated_values);
        } catch (error) {
            console.warn("RAMDB update: Error while encoding " + key + error);
            return false;
        }
        // -- memorizzo il dato
        this.db.set(key, [encoded_value, expire]);
        // ---
        return true;
    }
    /**
     * Elimina un record dal db
     * @param key
     * @returns true se un elemento della mappa esisteva ed è stato rimosso, o false se l'elemento non esiste.
     */
    static delete(key: string) {
        return this.db.delete(key);
    }
    /**
     * Pulisce l'intero db
     */
    static clear() {
        this.db = new Map();
    }
    /**
     * Periodicamente vengono controllati i record scaduti
     * e se lo sono vengono eliminati
     */
    static startCleanup() {
        if (this.cleanup) return;
        this.cleanup = true;
        // ---
        const cleanupFn = () => {
            const now = Date.now();
            for (const [key, [, expire]] of this.db.entries()) {
                if (expire <= now) {
                    this.delete(key);
                }
            }            
            setTimeout(cleanupFn, this.cleanup_interval);
        };
        // ---
        cleanupFn();
    }
}

RamDB.startCleanup();