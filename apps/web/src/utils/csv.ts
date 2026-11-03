// Conversores de células de CSV. O mapeamento linha → registro fica em cada feature
// (features/financeiro/csv-import.ts, features/pacientes/csv-import.ts).

export const parseCurrency = (val: string): number => {
    if (!val) return 0;
    // Remove everything except numbers, minus, comma and dot
    const clean = val.replace(/[^\d,.-]/g, "");

    // Check if it uses comma for decimals (brazilian format common in CSVs)
    // A comma followed by 2 digits at the end
    if (/,(\d{2})$/.test(clean)) {
        // 1.000,00 -> 1000.00
        return Number(clean.replace(/\./g, "").replace(",", "."));
    }
    return Number(clean);
};

// Ancoradas: sem o ^, "2026-03-05" casava "26-03-05" e virava 26/03/2005.
const DATE_DMY_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T].*)?$/;
const DATE_YMD_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/;

/** Data local se dia/mês existem no calendário (new Date(2026, 1, 31) viraria 3 de março). */
function localDate(year: number, month: number, day: number): Date | null {
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? d : null;
}

/**
 * Data de célula de CSV: dd/mm/aaaa, dd-mm-aa ou aaaa-mm-dd (com ou sem hora — a hora é
 * ignorada, vale o dia escrito). Devolve `null` quando vazia ou inválida — nunca "hoje":
 * antes, uma data ruim virava a data do import sem aviso.
 */
export const parseDate = (val: string): Date | null => {
    const text = val?.trim();
    if (!text) return null;

    const dmy = text.match(DATE_DMY_RE);
    if (dmy) {
        let year = parseInt(dmy[3], 10);
        if (year < 100) year += 2000;
        return localDate(year, parseInt(dmy[2], 10), parseInt(dmy[1], 10));
    }

    const ymd = text.match(DATE_YMD_RE);
    if (ymd) return localDate(parseInt(ymd[1], 10), parseInt(ymd[2], 10), parseInt(ymd[3], 10));

    return null;
};

export const parseStatus = (val: string): "paid" | "pending" => {
    const v = (val || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (v.includes("pag") || v.includes("rec") || v.includes("con") || v.includes("pai") || v.includes("done")) return "paid";
    return "pending";
};
