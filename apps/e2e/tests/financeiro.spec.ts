import { expect, test } from "./fixtures";

test("financeiro: receita e despesa, abas, edição e exclusão", async ({ page, psychologist }) => {
    await page.goto("/financeiro");

    await page.getByRole("button", { name: "Nova Transação" }).click();
    let sheet = page.getByRole("dialog");
    await sheet.getByLabel("Descrição").fill("Sessão Joana");
    await sheet.getByLabel("Valor (R$)").fill("250");
    await sheet.getByRole("button", { name: /Salvar/ }).click();
    await expect(page.getByText("Transação cadastrada com sucesso!")).toBeVisible();
    await expect(sheet).toBeHidden();

    await page.getByRole("button", { name: "Nova Transação" }).click();
    sheet = page.getByRole("dialog");
    await sheet.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Despesa (-)" }).click();
    await sheet.getByLabel("Descrição").fill("Aluguel sala");
    await sheet.getByLabel("Valor (R$)").fill("100");
    await sheet.getByRole("button", { name: /Salvar/ }).click();
    await expect(page.getByText("Transação cadastrada com sucesso!").first()).toBeVisible();
    await expect(sheet).toBeHidden();

    await page.getByRole("tab", { name: "Receitas" }).click();
    await expect(page.getByRole("cell", { name: "Sessão Joana" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Aluguel sala" })).toHaveCount(0);

    await page.getByRole("tab", { name: "Despesas" }).click();
    const row = page.getByRole("row", { name: /Aluguel sala/ });
    await expect(row).toBeVisible();
    await row.getByTitle("Editar").click();
    await page.getByRole("dialog").getByLabel("Valor (R$)").fill("120");
    await page.getByRole("dialog").getByRole("button", { name: /Salvar/ }).click();
    await expect(page.getByText("Transação atualizada com sucesso!")).toBeVisible();
    await expect(page.getByRole("row", { name: /Aluguel sala/ })).toContainText("120");

    await page.getByRole("row", { name: /Aluguel sala/ }).getByTitle("Deletar").click();
    await expect(page.getByText("Transação excluída com sucesso!")).toBeVisible();
    await expect(page.getByText("Nenhuma despesa", { exact: true })).toBeVisible();
});
