import { expect, test } from "./fixtures";

test("cadastro, busca, edição e exclusão de paciente", async ({ page, psychologist }) => {
    await page.goto("/pacientes");
    await expect(page.getByText("Nenhum paciente encontrado")).toBeVisible();

    await page.locator("#btn-new-patient").click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Novo Paciente")).toBeVisible();

    await sheet.getByLabel("Nome Completo *").fill("Jo");
    await sheet.getByLabel("CPF").fill("123");
    await sheet.getByRole("button", { name: "Salvar Cadastro" }).click();
    await expect(sheet.getByText("O nome deve ter pelo menos 3 caracteres")).toBeVisible();
    await expect(sheet.getByText("CPF inválido")).toBeVisible();

    await sheet.getByLabel("Nome Completo *").fill("Joana Prado Lima");
    await sheet.getByLabel("CPF").fill("52998224725");
    await sheet.getByRole("tab", { name: "Contato" }).click();
    await sheet.getByLabel("E-mail").fill("joana@paciente.dev");
    await sheet.getByRole("button", { name: "Salvar Cadastro" }).click();

    await expect(page.getByText("Paciente cadastrado com sucesso!")).toBeVisible();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("cell", { name: /Joana Prado Lima/ })).toBeVisible();

    await page.locator("#btn-new-patient").click();
    await page.getByRole("dialog").getByLabel("Nome Completo *").fill("Bruno Outro");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar Cadastro" }).click();
    await expect(page.getByRole("cell", { name: /Bruno Outro/ })).toBeVisible();

    await page.getByPlaceholder("Buscar por nome, CPF ou e-mail...").fill("joana@");
    await expect(page.getByRole("cell", { name: /Joana Prado Lima/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Bruno Outro/ })).toBeHidden();

    const joanaRow = page.getByRole("row", { name: /Joana Prado Lima/ });
    await joanaRow.getByTitle("Editar").click();
    await expect(page.getByRole("dialog").getByText("Editar Paciente")).toBeVisible();
    await page.getByRole("dialog").getByLabel("Nome Completo *").fill("Joana Prado Souza");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar Cadastro" }).click();
    await expect(page.getByText("Paciente atualizado com sucesso!")).toBeVisible();

    await page.getByPlaceholder("Buscar por nome, CPF ou e-mail...").fill("");
    await page.getByRole("row", { name: /Joana Prado Souza/ }).getByTitle("Prontuário").click();
    await expect(page).toHaveURL(/\/pacientes\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Joana Prado Souza" })).toBeVisible();

    await page.goto("/pacientes");
    await page.getByRole("row", { name: /Joana Prado Souza/ }).getByTitle("Deletar").click();
    await expect(page.getByText("Paciente excluído com sucesso!")).toBeVisible();
    await expect(page.getByRole("cell", { name: /Joana Prado Souza/ })).toBeHidden();
    await expect(page.getByRole("cell", { name: /Bruno Outro/ })).toBeVisible();
});
