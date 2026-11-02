import { z } from "zod";

// URLs typed by users end up in window.open, <a href> and <iframe src>. A
// "javascript:" value there runs in the app's origin, so only http(s) is
// accepted on write.
export function isHttpUrl(value: string) {
    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}

// Before PDFs went to object storage (May 2026) they were saved inline as
// data:application/pdf;base64 in document.content / clinicalRecord.fileUrl.
// Those legacy rows must keep opening; any other data: URL is refused.
const PDF_DATA_URL = /^data:application\/pdf;base64,/i;

export function isSafeDocumentUrl(value: string) {
    return isHttpUrl(value) || PDF_DATA_URL.test(value);
}

// "" is what an emptied form field sends; it means "no URL", not an invalid one.
export const optionalHttpUrl = z
    .union([z.literal(""), z.string().trim().refine(isHttpUrl, "Apenas URLs http(s) são aceitas.")])
    .optional();
