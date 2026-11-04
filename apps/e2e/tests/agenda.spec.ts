import { type Page } from "@playwright/test";
import { expect, test, trpc } from "./fixtures";

async function fillAppointment(page: Page, patient: string, start: string, end: string) {
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("combobox", { name: "Paciente" }).click();
    await page.getByRole("option", { name: patient }).click();
    await sheet.getByLabel("Início").fill(start);
    await sheet.getByLabel("Início").blur();
    await sheet.getByLabel("Fim").fill(end);
    await sheet.getByLabel("Fim").blur();
    return sheet;
}

test("agenda: criar, ver nas visões, conflito, reagendar e excluir", async ({ page, psychologist }) => {
    await trpc(page, "patient.create", { nome: "Diego Agenda" });

    await page.goto("/agendamento");
    await page.locator("#btn-new-appointment").click();
    let sheet = await fillAppointment(page, "Diego Agenda", "10:00", "10:50");
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Agendamento criado com sucesso!")).toBeVisible();
    await expect(sheet).toBeHidden();

    await page.locator("#tab-day-view").click();
    await expect(page.getByText("Diego Agenda").first()).toBeVisible();
    await expect(page.getByText("10:00 — 10:50")).toBeVisible();
    await page.locator("#tab-week-view").click();
    await expect(page.getByText("Diego").first()).toBeVisible();
    await page.locator("#tab-month-view").click();
    await expect(page.getByText("Diego").first()).toBeVisible();

    await page.locator("#btn-new-appointment").click();
    sheet = await fillAppointment(page, "Diego Agenda", "10:30", "11:20");
    await expect(sheet.getByText("O horário das")).toBeVisible();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(sheet.getByText("Confirme acima ou escolha outro horário para salvar.")).toBeVisible();
    await sheet.getByRole("switch", { name: "Agendar mesmo assim" }).click();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Agendamento criado com sucesso!").first()).toBeVisible();
    await expect(sheet).toBeHidden();

    await page.locator("#tab-day-view").click();
    await page.getByText("10:30 — 11:20").click();
    sheet = page.getByRole("dialog");
    await sheet.getByLabel("Início").fill("15:00");
    await sheet.getByLabel("Início").blur();
    await sheet.getByLabel("Fim").fill("15:50");
    await sheet.getByLabel("Fim").blur();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Agendamento atualizado com sucesso!")).toBeVisible();
    await expect(page.getByText("15:00 — 15:50")).toBeVisible();

    await page.getByText("15:00 — 15:50").click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Agendamento excluído com sucesso!")).toBeVisible();
    await expect(page.getByText("15:00 — 15:50")).toHaveCount(0);
    await expect(page.getByText("10:00 — 10:50")).toBeVisible();
});

test("fim antes do início mostra erro no formulário", async ({ page, psychologist }) => {
    await trpc(page, "patient.create", { nome: "Elisa Erro" });
    await page.goto("/agendamento");
    await page.locator("#btn-new-appointment").click();
    const sheet = await fillAppointment(page, "Elisa Erro", "11:00", "10:00");
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(sheet.getByText("O fim deve ser depois do início")).toBeVisible();
});
