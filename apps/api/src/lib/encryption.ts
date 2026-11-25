import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";
const KEY_BASE64 = /^[A-Za-z0-9+/_-]{43}=?$/;

type Env = Record<string, string | undefined>;

function configuredKeys(env: Env): { name: "ENCRYPTION_KEYS" | "ENCRYPTION_KEY"; values: string[] } | null {
    const ring = env.ENCRYPTION_KEYS?.trim();
    if (ring) return { name: "ENCRYPTION_KEYS", values: ring.split(",").map((k) => k.trim()) };
    const single = env.ENCRYPTION_KEY?.trim();
    if (single) return { name: "ENCRYPTION_KEY", values: [single] };
    return null;
}

export function checkEncryptionKeys(env: Env): string[] {
    if (env.ENCRYPTION_KEYS?.trim() && env.ENCRYPTION_KEY?.trim()) {
        return ["Defina ENCRYPTION_KEYS ou ENCRYPTION_KEY, não as duas (ENCRYPTION_KEYS=nova,antiga já inclui a antiga)."];
    }
    const source = configuredKeys(env);
    if (!source) return ["ENCRYPTION_KEY (ou ENCRYPTION_KEYS) não definida."];

    if (source.name === "ENCRYPTION_KEY") {
        if (source.values[0].includes(",")) {
            return ["ENCRYPTION_KEY tem vírgula; para mais de uma chave use ENCRYPTION_KEYS=nova,antiga."];
        }
        return KEY_BASE64.test(source.values[0])
            ? []
            : ["ENCRYPTION_KEY deve ter 32 bytes depois de decodificada de base64."];
    }

    const errors: string[] = [];
    source.values.forEach((value, i) => {
        if (!value) errors.push(`ENCRYPTION_KEYS tem a posição ${i + 1} vazia (vírgula sobrando?).`);
        else if (!KEY_BASE64.test(value)) {
            errors.push(`ENCRYPTION_KEYS: a chave ${i + 1} deve ter 32 bytes depois de decodificada de base64.`);
        }
    });
    const filled = source.values.filter(Boolean);
    if (new Set(filled).size !== filled.length) errors.push("ENCRYPTION_KEYS repete a mesma chave.");
    return errors;
}

let _cacheSource: string | null = null;
let _keyCache: Buffer[] = [];

export function getKeyRing(): Buffer[] {
    const source = `${process.env.ENCRYPTION_KEYS ?? ""}|${process.env.ENCRYPTION_KEY ?? ""}`;
    if (_cacheSource === source) return _keyCache;
    const errors = checkEncryptionKeys(process.env);
    if (errors.length > 0) throw new Error(errors.join(" "));
    _keyCache = configuredKeys(process.env)!.values.map((k) => Buffer.from(k, "base64"));
    _cacheSource = source;
    return _keyCache;
}

export function encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getKeyRing()[0], iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [CURRENT_VERSION, iv, tag, ct].map((b, i) => (i === 0 ? b : (b as Buffer).toString("base64"))).join(":");
}

function cipherParts(ciphertext: string): [string, string, string] {
    const parts = ciphertext.split(":");
    if (parts.length === 4 && parts[0] === "v1") return [parts[1], parts[2], parts[3]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2]];
    throw new Error("Invalid ciphertext format");
}

export function decryptWithKeyIndex(ciphertext: string): { plaintext: string; keyIndex: number } {
    const [ivB64, tagB64, ctB64] = cipherParts(ciphertext);
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const keys = getKeyRing();
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
        try {
            const decipher = createDecipheriv(ALGORITHM, keys[keyIndex], iv);
            decipher.setAuthTag(tag);
            const plaintext = decipher.update(ct, undefined, "utf8") + decipher.final("utf8");
            return { plaintext, keyIndex };
        } catch {
            continue;
        }
    }
    throw new Error(`Nenhuma das ${keys.length} chave(s) configurada(s) decripta este valor.`);
}

export function decrypt(ciphertext: string): string {
    return decryptWithKeyIndex(ciphertext).plaintext;
}

export const encryptField = (v: string | null | undefined): string | null => {
    if (v == null) return null;
    if (v === "") return "";
    return encrypt(v);
};

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function isCiphertext(v: string): boolean {
    if (!looksEncrypted(v)) return false;
    const [iv, tag] = cipherParts(v);
    return Buffer.from(iv, "base64").length === 12 && Buffer.from(tag, "base64").length === 16;
}

export function keyFingerprints(): string[] {
    return getKeyRing().map((k) => createHash("sha256").update(k).digest("hex").slice(0, 8));
}

export function looksEncrypted(v: string): boolean {
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
