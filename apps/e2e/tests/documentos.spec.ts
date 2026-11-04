import { expect, test } from "./fixtures";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test("documentos: valida PDF, envia, abre, filtra modelos e exclui", async ({ page, psychologist }) => {
    await page.goto("/documentos");
    await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();

    await page.getByRole("button", { name: "Novo Documento" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Título do Arquivo").fill("Contrato padrão");
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(sheet.getByText("Você precisa selecionar um arquivo PDF para armazenamento.")).toBeVisible();

    await sheet.locator("#pdfFile").setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(sheet.getByText("Por favor, selecione apenas arquivos PDF.")).toBeVisible();

    await sheet.locator("#pdfFile").setInputFiles({
        name: "grande.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    await expect(sheet.getByText("O arquivo deve ter no máximo 10MB.")).toBeVisible();

    await sheet.locator("#pdfFile").setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: PDF });
    await sheet.getByRole("switch", { name: "Modelo" }).click();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Documento criado com sucesso!")).toBeVisible();

    await page.getByRole("tab", { name: "Documentos" }).click();
    await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();
    await page.getByRole("tab", { name: "Modelos" }).click();
    const row = page.getByRole("row", { name: /Contrato padrão/ });
    await expect(row).toBeVisible();

    const pdfResponse = page.waitForResponse((r) => r.url().includes("/api/storage/local-download/"));
    await row.getByTitle("Abrir").click();
    await expect(page).toHaveURL(/\/documentos\/[^/]+$/);
    expect((await pdfResponse).status()).toBe(200);

    await page.goto("/documentos");
    await page.getByRole("row", { name: /Contrato padrão/ }).getByTitle("Deletar").click();
    await expect(page.getByText("Documento excluído com sucesso!")).toBeVisible();
    await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();
});
