import { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const URL_TTL_SECONDS = 10 * 60;
export const URL_TTL_MS = URL_TTL_SECONDS * 1000;

export type StorageDriver = "local" | "s3";

export function getDriver(): StorageDriver {
    return process.env.STORAGE_DRIVER === "s3" || !!process.env.AWS_DOCUMENTS_BUCKET
        ? "s3"
        : "local";
}

export function getS3Client() {
    return new S3Client({
        region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "sa-east-1",
    });
}

export function getBucketName() {
    const bucket = process.env.AWS_DOCUMENTS_BUCKET;
    if (!bucket) {
        throw new Error("AWS_DOCUMENTS_BUCKET precisa estar configurado para usar STORAGE_DRIVER=s3.");
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

export function toLocalFilePath(storageKey: string) {
    const baseDir = path.resolve(getLocalStorageDir());
    const normalized = storageKey.replaceAll("\\", "/");
    const resolved = path.resolve(baseDir, normalized);

    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
        throw new Error("Chave de storage invalida.");
    }

    return resolved;
}
