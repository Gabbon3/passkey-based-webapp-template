export class Bytes {
    static base64 = {
        decode(base64: string, urlsafe: boolean = false): Uint8Array {
            if (urlsafe) {
                base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
                base64 = base64.padEnd(
                    base64.length + ((4 - (base64.length % 4)) % 4),
                    "="
                );
            }
            const binaryString = atob(base64);
            return Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
        },
        encode(buffer: Uint8Array, urlsafe: boolean = false): string {
            const base64 = btoa(String.fromCharCode(...buffer));
            return urlsafe
                ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
                : base64;
        },
    };

    static base32 = {
        decode(base32String: string): Uint8Array {
            const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            const output: number[] = [];
            let buffer = 0;
            let bitsInBuffer = 0;
            for (const char of base32String) {
                const index = base32Alphabet.indexOf(char);
                if (index === -1) continue;
                buffer = (buffer << 5) | index;
                bitsInBuffer += 5;
                if (bitsInBuffer >= 8) {
                    output.push((buffer >> (bitsInBuffer - 8)) & 255);
                    bitsInBuffer -= 8;
                }
            }
            return new Uint8Array(output);
        },
        encode(uint8Array: Uint8Array): string {
            const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let output = "";
            let buffer = 0;
            let bitsInBuffer = 0;
            for (const byte of uint8Array) {
                buffer = (buffer << 8) | byte;
                bitsInBuffer += 8;
                while (bitsInBuffer >= 5) {
                    output += base32Alphabet[(buffer >> (bitsInBuffer - 5)) & 31];
                    bitsInBuffer -= 5;
                }
            }
            if (bitsInBuffer > 0) {
                output += base32Alphabet[(buffer << (5 - bitsInBuffer)) & 31];
            }
            return output;
        },
    };

    static hex = {
        _hex(hex_string: string): string {
            return hex_string.match(/.{1,2}/g)!.map((byte) => String.fromCharCode(parseInt(byte, 16))).join("");
        },
        hex_(text: string): string {
            return Array.from(text)
                .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("");
        },
        decode(hex: string): Uint8Array {
            hex = hex.replace(/\s+/g, "").toLowerCase();
            if (hex.length % 2 !== 0) {
                throw new Error("Hex string must have an even length");
            }
            const length = hex.length / 2;
            const array = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                array[i] = parseInt(hex.substr(i * 2, 2), 16);
            }
            return array;
        },
        encode(blob: Uint8Array): string {
            return Array.from(blob)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
        },
    };

    static txt = {
        encode(txt: string): Uint8Array {
            return new TextEncoder().encode(txt);
        },
        decode(buffer: Uint8Array): string {
            return new TextDecoder().decode(buffer);
        },
        base64_(txt: string): string {
            const B = new TextEncoder().encode(txt);
            return Bytes.base64.encode(B);
        },
        _base64(base64: string): string {
            const txt = Bytes.base64.decode(base64);
            return new TextDecoder().decode(txt);
        },
        Uint16_(txt: string | Uint8Array): Uint16Array {
            const B = typeof txt === "string" ? new TextEncoder().encode(txt) : txt;
            const length = B.length;
            const padded_length = length + (length % 2);
            const U16 = new Uint16Array(padded_length / 2);
            for (let i = 0; i < length; i += 2) {
                U16[i / 2] = (B[i] | (B[i + 1] << 8)) >>> 0;
            }
            return U16;
        },
    };

    static bigint = {
        decode(n: bigint): Uint8Array {
            const L = Math.ceil(n.toString(2).length / 8);
            const B = new Uint8Array(L);
            for (let i = 0; i < L; i++) {
                B[i] = Number(n & 255n);
                n >>= 8n;
            }
            return B.reverse();
        },
        encode(byte: Uint8Array): bigint {
            let n = 0n;
            for (const b of byte) {
                n = (n << 8n) | BigInt(b);
            }
            return n;
        },
    };

    static merge(buffers: Uint8Array[], size: number): Uint8Array | Uint16Array | Uint32Array {
        let length = 0;
        for (const buffer of buffers) {
            length += buffer.length;
        }
        let merged_array: Uint8Array | Uint16Array | Uint32Array;
        switch (size) {
            case 8:
                merged_array = new Uint8Array(length);
                break;
            case 16:
                merged_array = new Uint16Array(length);
                break;
            case 32:
                merged_array = new Uint32Array(length);
                break;
            default:
                throw new Error("Invalid size");
        }
        let offset = 0;
        for (const buffer of buffers) {
            merged_array.set(buffer, offset);
            offset += buffer.length;
        }
        return merged_array;
    }

    static compare(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
}