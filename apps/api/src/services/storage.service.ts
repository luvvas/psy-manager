import {
    GetObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
    assertPdf,
    buildStorageKey,
    getBucketName,
    getDriver,
    getS3Client,
    toLocalFilePath,
    URL_TTL_MS,
    URL_TTL_SECONDS,
} from "../utils/storage.utils";

type UploadToken = {
    storageKey: string;
    contentType: string;
    fileSize: number;
    expiresAt: number;
};

type ReadToken = {
    storageKey: string;
    expiresAt: number;
};

const uploadTokens = new Map<string, UploadToken>();
const readTokens = new Map<string, ReadToken>();

function cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of uploadTokens) {
        if (data.expiresAt < now) uploadTokens.delete(token);
    }
    for (const [token, data] of readTokens) {
        if (data.expiresAt < now) readTokens.delete(token);
    }
}

export const storageService = {
    async createUploadTarget(
        psychologistId: string,
        input: { fileName: string; contentType: string; fileSize: number }
    ) {
        assertPdf(input.contentType, input.fileSize);

        const storageKey = buildStorageKey(psychologistId, input.fileName);
        const driver = getDriver();

        if (driver === "s3") {
            const command = new PutObjectCommand({
                Bucket: getBucketName(),
                Key: storageKey,
                ContentType: input.contentType,
                ContentLength: input.fileSize,
            });

            return {
                driver,
                storageKey,
                uploadUrl: await getSignedUrl(getS3Client(), command, {
                    expiresIn: URL_TTL_SECONDS,
                }),
                method: "PUT" as const,
                headers: {
                    "Content-Type": input.contentType,
                },
            };
        }

        cleanupExpiredTokens();
        const token = randomUUID();
        uploadTokens.set(token, {
            storageKey,
            contentType: input.contentType,
            fileSize: input.fileSize,
            expiresAt: Date.now() + URL_TTL_MS,
        });

        return {
            driver,
            storageKey,
            uploadUrl: `/api/storage/local-upload/${token}`,
            method: "PUT" as const,
            headers: {
                "Content-Type": input.contentType,
            },
        };
    },

    async createReadUrl(storageKey: string) {
        const driver = getDriver();

        if (driver === "s3") {
            const command = new GetObjectCommand({
                Bucket: getBucketName(),
                Key: storageKey,
                ResponseContentType: "application/pdf",
                ResponseContentDisposition: "inline",
            });

            return await getSignedUrl(getS3Client(), command, {
                expiresIn: URL_TTL_SECONDS,
            });
        }

        cleanupExpiredTokens();
        const token = randomUUID();
        readTokens.set(token, {
            storageKey,
            expiresAt: Date.now() + URL_TTL_MS,
        });

        return `/api/storage/local-download/${token}`;
    },

    async saveLocalUpload(token: string, request: Request) {
        cleanupExpiredTokens();

        const upload = uploadTokens.get(token);
        if (!upload || upload.expiresAt < Date.now()) {
            return new Response("URL de upload expirada.", { status: 410 });
        }

        const contentType = request.headers.get("content-type") || "";
        const contentLength = Number(request.headers.get("content-length") || upload.fileSize);

        if (contentType !== upload.contentType || contentLength > upload.fileSize) {
            return new Response("Arquivo invalido.", { status: 400 });
        }

        const buffer = Buffer.from(await request.arrayBuffer());
        if (buffer.length > upload.fileSize) {
            return new Response("Arquivo maior que o permitido.", { status: 400 });
        }

        const filePath = toLocalFilePath(upload.storageKey);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, buffer);
        uploadTokens.delete(token);

        return new Response(null, { status: 204 });
    },

    async readLocalFile(token: string) {
        cleanupExpiredTokens();

        const read = readTokens.get(token);
        if (!read || read.expiresAt < Date.now()) {
            return new Response("URL de leitura expirada.", { status: 410 });
        }

        try {
            const file = await readFile(toLocalFilePath(read.storageKey));
            return new Response(file, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": "inline",
                    "Cache-Control": "private, max-age=300",
                },
            });
        } catch {
            return new Response("Arquivo nao encontrado.", { status: 404 });
        }
    },
};
