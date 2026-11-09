import { formatCurrency } from "@/utils/format";

const DATE = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

const METHOD_LABELS: Record<string, string> = {
    pix: "Pix",
    cartao: "cartão",
    transferencia: "transferência",
    dinheiro: "dinheiro",
    outro: "outro meio",
};

export const paymentMethodLabel = (method: string) => METHOD_LABELS[method] ?? method;

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export interface ReceiptInput {
    payerName: string;
    payerCpf?: string | null;
    patientName: string;
    amount: number;
    paidAt: Date;
    method: string;
    sessionDates: Date[];
    psychologistName: string;
    psychologistCpf?: string | null;
    crp?: string | null;
    city?: string | null;
    address?: string | null;
}

const formatCpf = (cpf: string) => {
    const d = cpf.replace(/\D/g, "");
    return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
};

export function professionalAddress(p: {
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    addressDistrict?: string | null;
    city?: string | null;
    state?: string | null;
    addressZip?: string | null;
}): string | null {
    const street = [p.addressStreet, p.addressNumber].filter(Boolean).join(", ");
    const place = [p.city, p.state].filter(Boolean).join("/");
    const parts = [street, p.addressComplement, p.addressDistrict, place, p.addressZip ? `CEP ${p.addressZip}` : null].filter(
        Boolean
    );
    return p.addressStreet ? parts.join(" — ") : null;
}

export function receiptHtml(r: ReceiptInput): string {
    const e = escapeHtml;
    const sessions = r.sessionDates.map((d) => DATE.format(d)).join(", ");
    const forPatient = r.payerName === r.patientName ? "" : `, referente ao atendimento de <strong>${e(r.patientName)}</strong>`;
    const cpf = r.payerCpf ? `, CPF ${e(formatCpf(r.payerCpf))}` : "";
    const professional = [
        r.crp ? `CRP ${e(r.crp)}` : "",
        r.psychologistCpf ? `CPF ${e(formatCpf(r.psychologistCpf))}` : "",
    ]
        .filter(Boolean)
        .join(" · ");
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 24px;color:#0f172a;line-height:1.6}
h1{font-size:20px;letter-spacing:.08em;text-align:center}p{margin:16px 0}.valor{font-size:18px;font-weight:600;text-align:right}
.assinatura{margin-top:72px;text-align:center}.linha{border-top:1px solid #0f172a;width:320px;margin:0 auto 4px}
@media print{body{margin:24px auto}}</style></head><body>
<h1>RECIBO</h1>
<p class="valor">${e(formatCurrency(r.amount))}</p>
<p>Recebi de <strong>${e(r.payerName)}</strong>${cpf} a quantia de <strong>${e(formatCurrency(r.amount))}</strong>${forPatient}, por ${r.sessionDates.length === 1 ? "sessão de psicoterapia realizada em" : "sessões de psicoterapia realizadas em"} ${e(sessions)}, pago via ${e(paymentMethodLabel(r.method))}.</p>
<p>${e(r.city ? `${r.city}, ` : "")}${e(DATE.format(r.paidAt))}.</p>
<div class="assinatura"><div class="linha"></div>${e(r.psychologistName)}${professional ? `<br>${professional}` : ""}${r.address ? `<br><small>${e(r.address)}</small>` : ""}</div>
</body></html>`;
}

export function printReceipt(r: ReceiptInput): boolean {
    const win = window.open("", "_blank");
    if (!win) return false;
    win.document.write(receiptHtml(r));
    win.document.close();
    win.focus();
    win.print();
    return true;
}
