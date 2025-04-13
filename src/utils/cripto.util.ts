import crypto from "crypto";

type HmacOptions = {
    keyEncoding?: BufferEncoding;
    algo?: string;
    outputEncoding?: BufferEncoding;
};

type HashOptions = {
    algorithm?: string;
    encoding?: BufferEncoding;
};

export class Cripto {
    /**
     * Genera una serie di byte casuali crittograficamente sicuri.
     * @param size Numero di byte da generare.
     * @param encoding Formato della chiave. Se null, ritorna un Uint8Array.
     * @returns Byte generati in formato specificato.
     */
    static randomBytes(size: number, encoding: BufferEncoding | null = null): string | Uint8Array {
        const bytes = crypto.randomBytes(size);
        return encoding ? bytes.toString(encoding) : new Uint8Array(bytes);
    }

    /**
     * Genera un bypass token (esadecimale), es: `byp-{token}`.
     * @param randomSize Numero di byte casuali da concatenare al timestamp.
     * @returns Token esadecimale.
     */
    static bypassToken(randomSize = 16): string {
        return Date.now().toString(16) + this.randomBytes(randomSize, "hex");
    }

    /**
     * Genera un numero casuale ad alta entropia tra 0 (incluso) e 1 (escluso).
     * Sostituisce `Math.random()` in contesti crittografici.
     * @returns Numero casuale [0, 1).
     */
    static randomRatio(): number {
        const randomWord = crypto.randomInt(0, 2 ** 32);
        return randomWord / 2 ** 32;
    }

    /**
     * Genera un codice MFA casuale a 6 cifre.
     * @returns Codice a 6 cifre.
     */
    static randomMfaCode(): string {
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += "1234567890"[Math.floor(this.randomRatio() * 10)];
        }
        return code;
    }

    /**
     * Genera un HMAC di un messaggio con una chiave.
     * @param message Messaggio da crittografare.
     * @param key Chiave segreta.
     * @param options Opzioni di hashing.
     * @returns HMAC in formato richiesto.
     */
    static hmac(
        message: string | crypto.BinaryLike,
        key: string | Buffer,
        options: HmacOptions = {}
    ): string | Uint8Array {
        const keyBuffer =
            typeof key === "string"
                ? Buffer.from(key, options.keyEncoding)
                : Buffer.from(key); // key è già un Buffer

        const hmacBuffer = crypto.createHmac(options.algo ?? "sha256", keyBuffer)
            .update(message)
            .digest();

        return options.outputEncoding
            ? hmacBuffer.toString(options.outputEncoding)
            : new Uint8Array(hmacBuffer);
    }


    /**
     * Esegue hash con salt usando HMAC.
     * @param message Messaggio da proteggere.
     * @returns Uint8Array contenente salt + hash.
     */
    static salting(message: string | crypto.BinaryLike): Uint8Array {
        const salt = crypto.randomBytes(16);
        const hashResult = this.hmac(message, salt);

        if (typeof hashResult === "string") {
            throw new Error("HMAC must return raw bytes for salting, not a string. Set `outputEncoding = undefined`.");
        }

        return new Uint8Array(Buffer.concat([salt, Buffer.from(hashResult)]));
    }

    /**
     * Verifica un salting.
     * @param message Messaggio originale.
     * @param saltHash Uint8Array con salt concatenato a hash.
     * @returns True se valido.
     */
    static verifySalting(message: string | crypto.BinaryLike, saltHash: Uint8Array): boolean {
        const salt = saltHash.subarray(0, 16);
        const originalHash = saltHash.subarray(16);

        // Converte salt in Buffer per compatibilità con createHmac
        const newHash = this.hmac(message, Buffer.from(salt));

        if (typeof newHash === "string") {
            throw new Error("HMAC must return raw bytes for salting verification.");
        }

        return Buffer.compare(Buffer.from(originalHash), Buffer.from(newHash)) === 0;
    }

    /**
     * Tronca un buffer in base alla modalità scelta.
     * @param buf Buffer da troncare.
     * @param length Lunghezza risultante.
     * @param mode Modalità: 'start' | 'end' | 'middle' | 'smart'.
     * @returns Buffer troncato.
     */
    static truncateBuffer(
        buf: Uint8Array,
        length: number,
        mode: "start" | "end" | "middle" | "smart" = "start"
    ): Uint8Array {
        if (!(buf instanceof Uint8Array)) {
            throw new TypeError("Expected a Uint8Array");
        }

        if (length >= buf.length) return buf;

        switch (mode) {
            case "start":
                return buf.slice(0, length);
            case "end":
                return buf.slice(buf.length - length);
            case "middle": {
                const start = Math.floor((buf.length - length) / 2);
                return buf.slice(start, start + length);
            }
            case "smart": {
                const half = Math.floor(length / 2);
                const startPart = buf.slice(0, half);
                const endPart = buf.slice(buf.length - (length - half));
                const combined = new Uint8Array(length);
                combined.set(startPart);
                combined.set(endPart, half);
                return combined;
            }
            default:
                throw new Error(`Unknown truncation mode: ${mode}`);
        }
    }

    /**
     * Calcola l'hash di un messaggio.
     * @param message Messaggio da hashare.
     * @param options Algoritmo e encoding.
     * @returns Hash come stringa o Uint8Array.
     */
    static hash(message: string, options: HashOptions = {}): string | Uint8Array {
        const hashBuffer = crypto.createHash(options.algorithm ?? "sha256")
            .update(message)
            .digest();
        return options.encoding
            ? hashBuffer.toString(options.encoding)
            : new Uint8Array(hashBuffer);
    }
}