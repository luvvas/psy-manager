import { expect, test, trpc } from "./fixtures";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test("registro de prontuário: rascunho, anexo em PDF e assinatura", async ({ page, psychologist }) => {
    const { id } = await trpc<{ id: string }>(page, "patient.create", { nome: "Carla Registro" });

    await page.goto(`/pacientes/${id}`);
    await expect(page.getByRole("heading", { name: "Carla Registro" })).toBeVisible();
    await expect(page.getByText("Nenhum registro encontrado")).toBeVisible();

    await page.getByRole("button", { name: "Novo Registro" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Título do Documento").fill("Ev");
    await sheet.getByRole("button", { name: /Salvar|Criar/ }).click();
    await expect(sheet.getByText("Título deve ter pelo menos 3 caracteres")).toBeVisible();

    await sheet.getByLabel("Título do Documento").fill("Evolução sessão 1");
    await sheet.locator("#pdfFile").setInputFiles({ name: "sessao-1.pdf", mimeType: "application/pdf", buffer: PDF });
    await sheet.getByRole("button", { name: /Salvar|Criar/ }).click();
    await expect(page.getByText("Registro criado com sucesso!")).toBeVisible();

    const card = page.locator("div.rounded-lg.border").filter({ hasText: "Evolução sessão 1" });
    await expect(card.getByText("Rascunho")).toBeVisible();

    const pdfResponse = page.waitForResponse((r) => r.url().includes("/api/storage/local-download/"));
    await card.getByRole("button", { name: "Ver Anexo" }).click();
    await expect(page.getByTitle("Evolução sessão 1")).toBeVisible();
    const pdf = await pdfResponse;
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    await page.getByRole("button", { name: "Voltar à Linha do Tempo" }).click();

    await card.getByRole("button", { name: "Assinar" }).click();
    await expect(page.getByText("Registro finalizado e assinado!")).toBeVisible();
    await expect(card.getByText("Assinado")).toBeVisible();
    await expect(card.getByRole("button", { name: "Assinar" })).toHaveCount(0);
});

test("paciente inexistente mostra a tela de não encontrado", async ({ page, psychologist }) => {
    await page.goto("/pacientes/nao-existe");
    await expect(page.getByText("Paciente não encontrado")).toBeVisible();
    await page.getByRole("button", { name: "Voltar para Pacientes" }).click();
    await expect(page).toHaveURL(/\/pacientes$/);
});
