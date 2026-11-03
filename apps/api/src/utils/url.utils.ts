import { z } from "zod";

export function isHttpUrl(value: string) {
    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}

const PDF_DATA_URL = /^data:application\/pdf;base64,/i;

export function isSafeDocumentUrl(value: string) {
    return isHttpUrl(value) || PDF_DATA_URL.test(value);
}

export const optionalHttpUrl = z
    .union([z.literal(""), z.string().trim().refine(isHttpUrl, "Apenas URLs http(s) são aceitas.")])
    .optional();
