const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

export function crc16(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function ascii(value: string, max: number) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9 .\-/]/g, "")
        .trim()
        .slice(0, max)
        .toUpperCase();
}

const CPF_FORMATTED = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_FORMATTED = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const PHONE_FORMATTED = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

export function normalizePixKey(raw: string): string {
    const key = raw.trim();
    if (CPF_FORMATTED.test(key) || CNPJ_FORMATTED.test(key)) return key.replace(/\D/g, "");
    if (key.startsWith("+")) return `+${key.replace(/\D/g, "")}`;
    if (/[()\s-]/.test(key) && PHONE_FORMATTED.test(key)) return `+55${key.replace(/\D/g, "")}`;
    return key;
}

export interface PixPayloadInput {
    key: string;
    name: string;
    city: string;
    amount?: number;
}

export function buildPixPayload({ key, name, city, amount }: PixPayloadInput): string {
    const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", normalizePixKey(key));
    const body =
        field("00", "01") +
        field("26", merchantAccount) +
        field("52", "0000") +
        field("53", "986") +
        (amount && amount > 0 ? field("54", amount.toFixed(2)) : "") +
        field("58", "BR") +
        field("59", ascii(name, 25) || "RECEBEDOR") +
        field("60", ascii(city, 15) || "BRASIL") +
        field("62", field("05", "***")) +
        "6304";
    return body + crc16(body);
}
