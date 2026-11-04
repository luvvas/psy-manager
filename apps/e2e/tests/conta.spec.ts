import { readFileSync } from "fs";
import { PASSWORD, expect, test, trpc } from "./fixtures";

test("perfil: exportar dados e excluir a conta", async ({ page, psychologist }) => {
    await trpc(page, "patient.create", { nome: "Paciente Exportado" });
    await page.goto("/inicio");

    await page.getByRole("button", { name: new RegExp(psychologist.name) }).click();
    await page.getByRole("dialog", { name: "Meu Perfil" }).getByRole("tab", { name: "Segurança" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar meus dados" }).click();
    const file = await download;
    const exported = JSON.parse(readFileSync((await file.path())!, "utf8"));
    expect(exported.psychologist.email).toBe(psychologist.email);
    expect(exported.patients.map((p: { nome: string }) => p.nome)).toEqual(["Paciente Exportado"]);
    await expect(page.getByText("Dados exportados com sucesso!")).toBeVisible();

    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    await expect(page.getByRole("dialog", { name: "Excluir conta permanentemente?" })).toBeVisible();
    await page.getByRole("button", { name: "Excluir permanentemente" }).click();
    await expect(page).not.toHaveURL(/\/inicio/);

    await page.goto("/login");
    await page.getByLabel("Email").fill(psychologist.email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/login/);
});

test("sair encerra a sessão e protege as rotas", async ({ page, psychologist }) => {
    await page.goto("/inicio");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/financeiro");
    await expect(page).toHaveURL(/\/login/);
});

test("sessão expirada no servidor leva para o login na próxima consulta", async ({ page, psychologist }) => {
    await page.goto("/pacientes");
    await expect(page.locator("#btn-new-patient")).toBeVisible();

    await page.context().clearCookies();
    await page.getByRole("link", { name: "Financeiro" }).click();
    await expect(page).toHaveURL(/\/login/);
});
