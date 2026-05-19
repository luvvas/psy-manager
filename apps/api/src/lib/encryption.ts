import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
    return Buffer.from(key, "base64");
}

export function encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) throw new Error("Invalid ciphertext format");
    const [ivB64, tagB64, ctB64] = parts;
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return (
        decipher.update(Buffer.from(ctB64, "base64"), undefined, "utf8") +
        decipher.final("utf8")
    );
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
