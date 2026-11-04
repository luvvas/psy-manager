import { enableFlagFor, expect, test, trpc } from "./fixtures";

test("pagamentos: sessão concluída vira cobrança, é cobrada, paga e gera receita e recibo", async ({ page, context, psychologist }) => {
    await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "whatsapp" }));
    await enableFlagFor(page, "pagamentos");
    await trpc(page, "psychologist.updateProfile", {
        pixKey: "ana@pix.dev",
        cpf: "52998224725",
        crp: "06/123456",
        city: "São Paulo",
        state: "SP",
        addressStreet: "Av. Paulista",
        addressNumber: "1000",
        addressZip: "01310-100",
    });
    const { id: patientId } = await trpc<{ id: string }>(page, "patient.create", {
        nome: "Joana Pagante",
        telefone: "(11) 98888-7777",
        valorSessao: "200",
    });
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    await trpc(page, "appointment.create", {
        patientId,
        date: day.toISOString(),
        startTime: "09:00",
        endTime: "09:50",
        status: "confirmed",
        sessionType: "in_person",
        type: "individual",
        isRecurring: false,
    });

    await page.goto("/agendamento");
    await page.locator("#tab-day-view").click();
    await page.getByText("09:00 — 09:50").click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Concluído" }).click();
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Agendamento atualizado com sucesso!")).toBeVisible();

    await page.goto("/pagamentos");
    await expect(page).toHaveURL(/\/financeiro\?aba=receber$/);
    const row = page.getByRole("row", { name: /Joana Pagante/ });
    await expect(row).toContainText("1 em aberto");
    await expect(row).toContainText("R$ 200,00");

    const whatsapp = page.waitForEvent("popup");
    await row.getByTitle("Cobrar no WhatsApp").click();
    const waUrl = new URL((await whatsapp).url());
    expect(waUrl.host).toBe("wa.me");
    expect(waUrl.pathname).toBe("/5511988887777");
    const message = waUrl.searchParams.get("text") ?? "";
    expect(message).toContain("1 sessão, total de R$");
    expect(message).toContain("000201");
    expect(message).toContain("ana@pix.dev");

    await row.getByTitle("Registrar pagamento").click();
    const paySheet = page.getByRole("dialog", { name: "Registrar Pagamento" });
    await expect(paySheet.getByText("Total recebido")).toBeVisible();
    await expect(paySheet).toContainText("R$ 200,00");
    await paySheet.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(page.getByText("Pagamento de R$ 200,00 registrado com sucesso!")).toBeVisible();
    await expect(page.getByText("Nada a receber")).toBeVisible();

    await page.getByRole("tab", { name: "Receitas" }).click();
    await expect(page.getByRole("row", { name: /Pagamento de 1 sessão/ })).toContainText("Joana Pagante");

    await page.goto(`/pacientes/${patientId}?aba=financeiro`);
    await expect(page.getByRole("tab", { name: "Financeiro", selected: true })).toBeVisible();
    const paymentRow = page.getByRole("row", { name: /Pix/ });
    await expect(paymentRow).toContainText("R$ 200,00");
    const receipt = page.waitForEvent("popup");
    await paymentRow.getByTitle("Imprimir recibo").click();
    const receiptPage = await receipt;
    await expect(receiptPage.getByRole("heading", { name: "RECIBO" })).toBeVisible();
    await expect(receiptPage.locator("body")).toContainText("Recebi de Joana Pagante");
    await expect(receiptPage.locator("body")).toContainText(psychologist.name);
    await expect(receiptPage.locator("body")).toContainText("CRP 06/123456 · CPF 529.982.247-25");
    await expect(receiptPage.locator("body")).toContainText("Av. Paulista, 1000 — São Paulo/SP — CEP 01310-100");
    await receiptPage.close();

    await paymentRow.getByTitle("Desfazer pagamento").click();
    await expect(page.getByText("Pagamento desfeito com sucesso!")).toBeVisible();
    await expect(page.getByText("Nenhum pagamento", { exact: true })).toBeVisible();
    await expect(page.getByRole("row", { name: /Em aberto|Vencido/ })).toContainText("R$ 200,00");
});

test("pagamentos desligado: sem aba A receber e /pagamentos cai no Financeiro comum", async ({ page, psychologist }) => {
    await trpc(page, "patient.create", { nome: `Sem Flag ${psychologist.email}` });
    await page.goto("/pagamentos");
    await expect(page).toHaveURL(/\/financeiro/);
    await expect(page.getByRole("tab", { name: "Resumo", selected: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "A receber" })).toHaveCount(0);
});
