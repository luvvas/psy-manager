import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";

// Cache the key buffer so we don't re-parse the env var on every call.
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
    // Format: v1:<iv>:<tag>:<ciphertext>
    return [CURRENT_VERSION, iv, tag, ct].map((b, i) => (i === 0 ? b : (b as Buffer).toString("base64"))).join(":");
}

export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");

    // Versioned format: v1:<iv>:<tag>:<ciphertext>
    if (parts.length === 4 && parts[0] === "v1") {
        const [, ivB64, tagB64, ctB64] = parts;
        const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        return (
            decipher.update(Buffer.from(ctB64, "base64"), undefined, "utf8") +
            decipher.final("utf8")
        );
    }

    // Legacy format (pre-versioning): <iv>:<tag>:<ciphertext>
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

// Handles null/undefined and empty strings; fallback for legacy unencrypted data
export const encryptField = (v: string | null | undefined): string | null => {
    if (v == null) return null;
    if (v === "") return "";
    return encrypt(v);
};

export const decryptField = (v: string | null | undefined): string | null => {
    if (v == null) return null;
    if (v === "") return "";
    try {
        return decrypt(v);
    } catch {
        return v; // graceful fallback: return as-is if not encrypted (legacy data)
    }
};
