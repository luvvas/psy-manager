import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";

let _keyCache: Buffer | null = null;

function getKey(): Buffer {
    if (_keyCache) return _keyCache;
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
    _keyCache = Buffer.from(key, "base64");
    return _keyCache;
}

export function encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [CURRENT_VERSION, iv, tag, ct].map((b, i) => (i === 0 ? b : (b as Buffer).toString("base64"))).join(":");
}

export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");

    if (parts.length === 4 && parts[0] === "v1") {
        const [, ivB64, tagB64, ctB64] = parts;
        const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        return (
            decipher.update(Buffer.from(ctB64, "base64"), undefined, "utf8") +
            decipher.final("utf8")
        );
    }

    if (parts.length === 3) {
        const [ivB64, tagB64, ctB64] = parts;
        const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        return (
            decipher.update(Buffer.from(ctB64, "base64"), undefined, "utf8") +
            decipher.final("utf8")
        );
    }

    throw new Error("Invalid ciphertext format");
}

export const encryptField = (v: string | null | undefined): string | null => {
    if (v == null) return null;
    if (v === "") return "";
    return encrypt(v);
};

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function looksEncrypted(v: string): boolean {
    const parts = v.split(":");
    if (parts.length === 4 && parts[0] === "v1") return true;
    return parts.length === 3 && parts.every((p) => BASE64.test(p));
}

let decryptFailures = 0;

export const getDecryptFailureCount = () => decryptFailures;

export function decryptField(v: string): string;
export function decryptField(v: string | null | undefined): string | null;
export function decryptField(v: string | null | undefined): string | null {
    if (v == null) return null;
    if (v === "") return "";
    try {
        return decrypt(v);
    } catch (err) {
        if (looksEncrypted(v)) {
            decryptFailures++;
            if (decryptFailures === 1 || decryptFailures % 100 === 0) {
                console.error(
                    `[encryption] falha ao decriptar campo cifrado (total desde o início: ${decryptFailures}):`,
                    err instanceof Error ? err.message : err
                );
            }
        }
        return v;
    }
}
