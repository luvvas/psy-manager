import { expect, test, trpc } from "./fixtures";

function hhmm(date: Date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

test("teleconsulta: psicóloga inicia, paciente entra pelo link público e a sessão é encerrada", async ({ page, browser, psychologist }) => {
    const now = new Date();
    test.skip(now.getHours() === 0 || now.getHours() === 23, "janela perto da meia-noite");

    const { id: patientId } = await trpc<{ id: string }>(page, "patient.create", { nome: "Paula Online" });
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    await trpc(page, "appointment.create", {
        patientId,
        date: day.toISOString(),
        startTime: hhmm(new Date(now.getTime() - 5 * 60_000)),
        endTime: hhmm(new Date(now.getTime() + 45 * 60_000)),
        status: "confirmed",
        sessionType: "online",
        type: "individual",
        isRecurring: false,
    });

    await page.goto("/agendamento");
    await page.locator("#tab-day-view").click();
    await page.getByText("Paula Online").first().click();
    await page.getByRole("dialog").getByRole("button", { name: /videochamada/i }).click();

    await expect(page).toHaveURL(/\/consulta\/[^/]+$/);
    await expect(page.getByText("Aguardando conexão...")).toBeVisible();
    await page.getByRole("button", { name: "Copiar link do paciente" }).click();
    const joinUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(joinUrl).toContain("/consulta/entrar/");

    const patientContext = await browser.newContext({
        permissions: ["camera", "microphone"],
        extraHTTPHeaders: { "cf-connecting-ip": "10.250.0.1" },
    });
    const patient = await patientContext.newPage();
    await patient.goto(joinUrl);
    await expect(patient.getByText("Consulta online")).toBeVisible();
    await expect(patient.getByText("Ana")).toBeVisible();
    await patient.getByRole("button", { name: "Entrar na consulta" }).click();

    await expect(page.getByText("Aguardando conexão...")).toBeHidden({ timeout: 20_000 });
    await expect(patient.getByText(/Aguardando conexão|Conectando/)).toBeHidden({ timeout: 20_000 });

    await page.getByRole("button", { name: "Encerrar" }).click();
    await expect(page).toHaveURL(/\/agendamento$/);

    await patient.goto(joinUrl);
    await expect(patient.getByText("Link inválido")).toBeVisible();
    await patientContext.close();
});
