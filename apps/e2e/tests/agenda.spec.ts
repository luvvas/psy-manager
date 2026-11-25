import { type Page } from "@playwright/test";
import { expect, test, trpc, trpcQuery } from "./fixtures";

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

test("lembrete por e-mail: padrão no perfil e campo no agendamento", async ({ page, psychologist }) => {
    await trpc(page, "patient.create", { nome: "Fábio Lembrete", email: "fabio@teste.dev" });
    await trpc(page, "patient.create", { nome: "Gina Sem Email" });

    await page.goto("/agendamento");
    await page.getByRole("button", { name: new RegExp(psychologist.name) }).click();
    const profile = page.getByRole("dialog", { name: "Meu Perfil" });
    await profile.getByRole("tab", { name: "Expediente" }).click();
    await profile.getByRole("switch", { name: "Lembrete por e-mail em novos agendamentos" }).click();
    await profile.getByRole("combobox", { name: "Enviar" }).click();
    await page.getByRole("option", { name: "2 horas antes", exact: true }).click();
    await profile.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Perfil atualizado com sucesso!")).toBeVisible();
    await expect(profile).toBeHidden();

    await page.locator("#btn-new-appointment").click();
    let sheet = await fillAppointment(page, "Gina Sem Email", "09:00", "09:50");
    await expect(sheet.getByRole("switch", { name: "Lembrete por e-mail" })).toBeChecked();
    await expect(sheet.getByRole("combobox", { name: "Enviar" })).toHaveText("2 horas antes");
    await expect(sheet.getByText("Este paciente não tem e-mail cadastrado.")).toBeVisible();
    await sheet.getByRole("button", { name: "Cancelar" }).click();

    await page.locator("#btn-new-appointment").click();
    sheet = await fillAppointment(page, "Fábio Lembrete", "14:00", "14:50");
    await expect(sheet.getByText("Este paciente não tem e-mail cadastrado.")).toHaveCount(0);
    await sheet.getByRole("combobox", { name: "Enviar" }).click();
    await page.getByRole("option", { name: "24 horas antes", exact: true }).click();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Agendamento criado com sucesso!")).toBeVisible();

    const [created] = await trpcQuery<{ reminderEnabled: boolean; reminderMinutesBefore: number | null }[]>(
        page,
        "appointment.list"
    );
    expect(created.reminderEnabled).toBe(true);
    expect(created.reminderMinutesBefore).toBe(1440);

    await page.locator("#tab-day-view").click();
    await page.getByText("14:00 — 14:50").click();
    sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("switch", { name: "Lembrete por e-mail" })).toBeChecked();
    await sheet.getByRole("switch", { name: "Lembrete por e-mail" }).click();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Agendamento atualizado com sucesso!")).toBeVisible();

    const [updated] = await trpcQuery<{ reminderEnabled: boolean }[]>(page, "appointment.list");
    expect(updated.reminderEnabled).toBe(false);
});
