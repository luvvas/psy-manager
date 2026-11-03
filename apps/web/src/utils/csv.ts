export const parseCurrency = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/[^\d,.-]/g, "");

    if (/,(\d{2})$/.test(clean)) {
        return Number(clean.replace(/\./g, "").replace(",", "."));
    }
    return Number(clean);
};

const DATE_DMY_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T].*)?$/;
const DATE_YMD_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/;

function localDate(year: number, month: number, day: number): Date | null {
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? d : null;
}

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
