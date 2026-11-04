/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import { existsSync } from "fs";
import { sql } from "drizzle-orm";
import { toLocalFilePath } from "../src/utils/storage.utils";
import { PDF_BYTES, app, createPatient, db, expectTrpcError, get, signUp, uploadPdf } from "./setup/helpers";

async function rows<T = Record<string, any>>(query: ReturnType<typeof sql>) {
    return (await db.execute(query)) as unknown as T[];
}

function put(uploadUrl: string, body: Uint8Array<ArrayBuffer>, contentType = "application/pdf") {
    return app.fetch(
        new Request(`http://localhost:3001${uploadUrl}`, {
            method: "PUT",
            headers: { "content-type": contentType, "content-length": String(body.length) },
            body,
        })
    );
}

describe("storage local: upload e leitura de PDF", () => {
    it("fluxo completo: preparar, enviar, criar documento, ler o arquivo", async () => {
        const ana = await signUp();
        const { target, response } = await uploadPdf(ana);
        expect(target.driver).toBe("local");
        expect(target.storageKey).toStartWith(`documents/${ana.id}/`);
        expect(response.status).toBe(204);

        const doc = await ana.caller.document.create({
            title: "Laudo",
            storageKey: target.storageKey,
            fileName: "laudo.pdf",
            mimeType: "application/pdf",
            fileSize: PDF_BYTES.length,
        });
        const read = await ana.caller.document.getDownloadUrl({ id: doc.id });
        const file = await get(read!.url!);
        expect(file.status).toBe(200);
        expect(file.headers.get("content-type")).toBe("application/pdf");
        expect(new Uint8Array(await file.arrayBuffer())).toEqual(PDF_BYTES);
    });

    it("token de upload é de uso único", async () => {
        const ana = await signUp();
        const { target } = await uploadPdf(ana);
        expect((await put(target.uploadUrl, PDF_BYTES)).status).toBe(410);
    });

    it("upload com tipo errado ou maior que o declarado é 400", async () => {
        const ana = await signUp();
        const target = await ana.caller.document.prepareUpload({ fileName: "a.pdf", contentType: "application/pdf", fileSize: 10 });
        expect((await put(target.uploadUrl, PDF_BYTES.slice(0, 5), "text/plain")).status).toBe(400);
        expect((await put(target.uploadUrl, PDF_BYTES)).status).toBe(400);
    });

    it("token desconhecido de upload ou leitura é 410", async () => {
        expect((await put("/api/storage/local-upload/nao-existe", PDF_BYTES)).status).toBe(410);
        expect((await get("/api/storage/local-download/nao-existe")).status).toBe(410);
    });

    it("prepareUpload recusa não-PDF e arquivo acima de 10MB", async () => {
        const ana = await signUp();
        await expectTrpcError(
            ana.caller.document.prepareUpload({ fileName: "a.png", contentType: "image/png" as any, fileSize: 10 }),
            "BAD_REQUEST"
        );
        await expectTrpcError(
            ana.caller.document.prepareUpload({ fileName: "a.pdf", contentType: "application/pdf", fileSize: 10 * 1024 * 1024 + 1 }),
            "BAD_REQUEST"
        );
    });
});

describe("documentos", () => {
    it("título e conteúdo cifrados no banco", async () => {
        const ana = await signUp();
        const doc = await ana.caller.document.create({ title: "Contrato Sigiloso", content: "https://exemplo.dev/a.pdf" });
        const [raw] = await rows(sql`select title, content from document where id = ${doc.id}`);
        expect(raw.title).toStartWith("v1:");
        expect(raw.content).toStartWith("v1:");
        expect((await ana.caller.document.getById({ id: doc.id }))?.title).toBe("Contrato Sigiloso");
    });

    it("storageKey de outra psicóloga ou com travessia de pasta é FORBIDDEN", async () => {
        const ana = await signUp();
        const bia = await signUp();
        const { target } = await uploadPdf(ana);
        await expectTrpcError(bia.caller.document.create({ title: "Roubo", storageKey: target.storageKey }), "FORBIDDEN");
        await expectTrpcError(
            bia.caller.document.create({ title: "Travessia", storageKey: `documents/${bia.id}/../${ana.id}/x.pdf` }),
            "FORBIDDEN"
        );
    });

    it("filtros por paciente e por modelo", async () => {
        const ana = await signUp();
        const p = await createPatient(ana);
        await ana.caller.document.create({ title: "Modelo", isTemplate: true });
        await ana.caller.document.create({ title: "Do paciente", patientId: p });
        await ana.caller.document.create({ title: "Avulso" });

        expect((await ana.caller.document.list({ isTemplate: true })).map((d) => d.title)).toEqual(["Modelo"]);
        expect((await ana.caller.document.list({ patientId: p })).map((d) => d.title)).toEqual(["Do paciente"]);
        expect((await ana.caller.document.list()).length).toBe(3);
    });

    it("getDownloadUrl só devolve conteúdo inline se for URL segura", async () => {
        const ana = await signUp();
        const unsafe = await ana.caller.document.create({ title: "x", content: "javascript:alert(1)" });
        const safe = await ana.caller.document.create({ title: "y", content: "https://exemplo.dev/a.pdf" });
        expect(await ana.caller.document.getDownloadUrl({ id: unsafe.id })).toEqual({ url: null });
        expect(await ana.caller.document.getDownloadUrl({ id: safe.id })).toEqual({ url: "https://exemplo.dev/a.pdf" });
    });

    it("excluir documento apaga a linha e o arquivo", async () => {
        const ana = await signUp();
        const { target } = await uploadPdf(ana);
        const doc = await ana.caller.document.create({ title: "Apagar", storageKey: target.storageKey });
        const filePath = toLocalFilePath(target.storageKey);
        expect(existsSync(filePath)).toBe(true);

        await ana.caller.document.delete({ id: doc.id });
        expect(await ana.caller.document.getById({ id: doc.id })).toBeNull();
        expect(existsSync(filePath)).toBe(false);
    });

    it("editar ou excluir documento inexistente é NOT_FOUND", async () => {
        const ana = await signUp();
        await expectTrpcError(ana.caller.document.update({ id: "nao-existe", title: "x" }), "NOT_FOUND");
        await expectTrpcError(ana.caller.document.delete({ id: "nao-existe" }), "NOT_FOUND");
    });
});
