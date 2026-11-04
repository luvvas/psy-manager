import { expect, test } from "./fixtures";

test("importação CSV de pacientes com mapeamento de colunas", async ({ page, psychologist }) => {
    await page.goto("/pacientes");

    const csv = "Nome Completo,Contato\nLuiza Importada,luiza@csv.dev\nMarcos Importado,marcos@csv.dev\n";
    await page.locator('input[type="file"][accept=".csv"]').setInputFiles({
        name: "pacientes.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
    });

    await expect(page.getByRole("cell", { name: "Luiza Importada" })).toBeVisible();
    const triggers = page.getByRole("button", { name: /Ignorar Coluna/ });
    await triggers.first().click();
    await page.getByRole("menuitem", { name: "Nome", exact: true }).click();
    await page.getByRole("button", { name: /Ignorar Coluna/ }).first().click();
    await page.getByRole("menuitem", { name: "E-mail", exact: true }).click();

    await page.getByRole("button", { name: /Importar 1\/1/ }).click();
    await expect(page.getByText("2 paciente(s) importado(s) com sucesso!")).toBeVisible();

    await page.getByRole("tab", { name: "Lista" }).click();
    await expect(page.getByRole("cell", { name: /Luiza Importada/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Marcos Importado/ })).toBeVisible();
});
