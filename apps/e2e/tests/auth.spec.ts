import { PASSWORD, expect, test, uniqueEmail } from "./fixtures";

test.describe("cadastro e login", () => {
    test("cadastro valida os campos e leva para o início", async ({ page }) => {
        await page.goto("/login?tab=register");

        await page.getByRole("button", { name: "Criar Conta" }).click();
        await expect(page.getByText("O nome deve ter pelo menos 3 caracteres")).toBeVisible();
        await expect(page.getByText("CRP inválido (formato esperado: 00/000000)")).toBeVisible();
        await expect(page.getByText("Telefone inválido")).toBeVisible();

        await page.getByLabel("Nome Completo").fill("Ana Cadastro Novo");
        await page.getByLabel("CRP").fill("06123456");
        await page.getByLabel("Celular").fill("11999990000");
        await page.getByLabel("Cidade / Estado").fill("São Paulo - SP");
        await page.getByLabel("Email").fill(uniqueEmail("cadastro"));
        await page.getByLabel("Senha").fill(PASSWORD);
        await page.getByRole("button", { name: "Criar Conta" }).click();

        await expect(page).toHaveURL(/\/inicio$/);
        await expect(page.getByText("Conta criada com sucesso!")).toBeVisible();
    });

    test("login volta para a rota pedida", async ({ page, psychologist }) => {
        await page.context().clearCookies();
        await page.goto("/pacientes");
        await expect(page).toHaveURL(/\/login/);

        await page.getByLabel("Email").fill(psychologist.email);
        await page.getByLabel("Senha").fill(psychologist.password);
        await page.getByRole("button", { name: "Entrar" }).click();

        await expect(page).toHaveURL(/\/pacientes$/);
        await expect(page.getByText(`Boas-vindas de volta, Dr(a). ${psychologist.name}!`)).toBeVisible();
    });

    test("senha errada mostra erro e não entra", async ({ page, psychologist }) => {
        await page.context().clearCookies();
        await page.goto("/login");
        await page.getByLabel("Email").fill(psychologist.email);
        await page.getByLabel("Senha").fill("senha-errada-123");
        await page.getByRole("button", { name: "Entrar" }).click();
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole("alert").or(page.locator(".text-destructive")).first()).toBeVisible();
    });

    test("usuária logada que abre /login vai para o início", async ({ page, psychologist }) => {
        await page.goto("/login");
        await expect(page).toHaveURL(/\/inicio$/);
        expect(psychologist.email).toContain("@");
    });
});
