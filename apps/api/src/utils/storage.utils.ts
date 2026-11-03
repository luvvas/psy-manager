import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const URL_TTL_SECONDS = 10 * 60;
export const URL_TTL_MS = URL_TTL_SECONDS * 1000;

export type StorageDriver = "local" | "s3";

export function getDriver(): StorageDriver {
    return process.env.STORAGE_DRIVER === "s3" || !!process.env.S3_BUCKET
        ? "s3"
        : "local";
}

export function getS3Client() {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    return new S3Client({
        region: process.env.S3_REGION ?? "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });
}

export function getBucketName() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
        throw new Error("S3_BUCKET precisa estar configurado para usar STORAGE_DRIVER=s3.");
    }
    return bucket;
}

export function getLocalStorageDir() {
    return process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), ".storage");
}

export function assertPdf(contentType: string, fileSize: number) {
    if (contentType !== "application/pdf") {
        throw new Error("Apenas arquivos PDF sao aceitos.");
    }
    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
        throw new Error("O arquivo deve ter no maximo 10MB.");
    }
}

export function buildStorageKey(psychologistId: string, fileName: string) {
    const extension = path.extname(fileName).toLowerCase() || ".pdf";
    return `documents/${psychologistId}/${randomUUID()}${extension}`;
}

export function isOwnStorageKey(psychologistId: string, storageKey: string) {
    const prefix = `documents/${psychologistId}/`;
    if (!psychologistId || !storageKey.startsWith(prefix)) return false;
    const fileName = storageKey.slice(prefix.length);
    return fileName.length > 0 && !/[\\/]/.test(fileName) && !fileName.includes("..");
}

export function assertOwnStorageKey(psychologistId: string, storageKey: string) {
    if (!isOwnStorageKey(psychologistId, storageKey)) {
        throw new Error("Chave de storage invalida.");
    }
}

export function toLocalFilePath(storageKey: string) {
    const baseDir = path.resolve(getLocalStorageDir());
    const normalized = storageKey.replaceAll("\\", "/");
    const resolved = path.resolve(baseDir, normalized);

    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
        throw new Error("Chave de storage invalida.");
    }

    return resolved;
}
