const PDF_DATA_URL = /^data:application\/pdf;base64,/i;

function currentOrigin() {
    return globalThis.location?.origin ?? "http://localhost";
}

export function safeUrl(
    value: string | null | undefined,
    options: { allowPdfDataUrl?: boolean } = {}
): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (options.allowPdfDataUrl && PDF_DATA_URL.test(trimmed)) return trimmed;

    try {
        const { protocol } = new URL(trimmed, currentOrigin());
        return protocol === "http:" || protocol === "https:" ? trimmed : undefined;
    } catch {
        return undefined;
    }
}

export function isHttpUrl(value: string) {
    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}
