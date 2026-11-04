import { buildPixPayload } from "@/utils/pix";
import { formatCurrency } from "@/utils/format";

export interface ChargeMessageInput {
    patientName: string;
    openCount: number;
    total: number;
    psychologistName: string;
    city?: string | null;
    pixKey?: string | null;
}

export function buildChargeMessage({ patientName, openCount, total, psychologistName, city, pixKey }: ChargeMessageInput) {
    const firstName = patientName.split(" ")[0];
    const sessions = openCount === 1 ? "1 sessão" : `${openCount} sessões`;
    const lines = [
        `Olá, ${firstName}! Tudo bem?`,
        `Segue o resumo das sessões em aberto: ${sessions}, total de ${formatCurrency(total)}.`,
    ];
    if (pixKey) {
        lines.push(
            "",
            `Chave Pix: ${pixKey}`,
            "Pix copia e cola:",
            buildPixPayload({ key: pixKey, name: psychologistName, city: city ?? "", amount: total })
        );
    }
    lines.push("", "Qualquer dúvida, estou à disposição.", psychologistName);
    return lines.join("\n");
}

export function whatsAppUrl(phone: string | null | undefined, text: string): string | null {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    const withCountry = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}
