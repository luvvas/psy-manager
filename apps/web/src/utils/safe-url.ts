// Defense in depth for user-controlled URLs that reach window.open, <a href>
// or <iframe src>: the API validates new writes, but rows saved before that
// validation existed may still hold e.g. "javascript:...".

const PDF_DATA_URL = /^data:application\/pdf;base64,/i;

function currentOrigin() {
    return globalThis.location?.origin ?? "http://localhost";
}

/**
 * Returns `value` when it is an http(s) URL (relative paths resolve against
 * the current origin, like the local-storage download route), otherwise
 * undefined. `allowPdfDataUrl` also accepts legacy inline PDFs.
 */
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
