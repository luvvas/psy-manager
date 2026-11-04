import { expect, newSession, test, trpc, trpcQuery } from "./fixtures";

type ClinicRow = { id: string; name: string; rooms: { id: string; name: string }[] };

test("clínica: cadastro, sala, convite aceito e agenda compartilhada sem dados do paciente", async ({ browser }) => {
    const ana = await newSession(browser, "Ana Dona Clinica");
    const bia = await newSession(browser, "Bia Convidada");

    await ana.page.goto("/clinicas");
    await expect(ana.page.getByText("Nenhuma clínica encontrada")).toBeVisible();
    await ana.page.locator("#btn-new-clinic").click();
    const form = ana.page.getByRole("dialog");
    await form.getByLabel("Nome da Clínica").fill("Clínica Harmonia E2E");
    await form.getByLabel("CNPJ").fill("12345678000190");
    await form.getByLabel("Telefone").fill("4133333333");
    await form.getByLabel("E-mail").fill("contato@harmonia.dev");
    await form.getByLabel("Endereço").fill("Av. Sete de Setembro, 1234");
    await form.getByLabel("Cidade").fill("Curitiba");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expect(ana.page.getByText("Clínica cadastrada com sucesso!")).toBeVisible();

    await ana.page.getByRole("row", { name: /Clínica Harmonia E2E/ }).getByTitle("Editar").click();
    const edit = ana.page.getByRole("dialog");
    await edit.getByRole("tab", { name: "Salas" }).click();
    await edit.getByPlaceholder("Ex.: Sala 1, Sala Azul, Ludoterapia").fill("Sala Azul");
    await edit.getByRole("button", { name: "Adicionar" }).click();
    await expect(edit.getByText("Sala Azul")).toBeVisible();
    await edit.getByPlaceholder("Ex.: Sala 1, Sala Azul, Ludoterapia").fill("Sala Azul");
    await edit.getByRole("button", { name: "Adicionar" }).click();
    await expect(ana.page.getByText("Já existe uma sala com esse nome.")).toBeVisible();

    await edit.getByRole("tab", { name: "Psicólogos" }).click();
    await edit.getByPlaceholder("email.do.psicologo@email.com").fill(bia.user.email);
    await edit.getByRole("button", { name: "Convidar" }).click();
    await expect(ana.page.getByText(/Convite enviado/)).toBeVisible();

    await bia.page.goto("/clinicas");
    await expect(bia.page.getByText("Convite para a clínica Clínica Harmonia E2E")).toBeVisible();
    await bia.page.getByRole("button", { name: "Aceitar" }).click();
    await expect(bia.page.getByText("Convite aceito. A clínica foi adicionada à sua lista.")).toBeVisible();
    await expect(bia.page.getByRole("cell", { name: /Clínica Harmonia E2E/ })).toBeVisible();

    const [clinic] = await trpcQuery<ClinicRow[]>(ana.page, "clinic.list");
    const room = clinic.rooms.find((r) => r.name === "Sala Azul")!;
    const { id: patientId } = await trpc<{ id: string }>(ana.page, "patient.create", { nome: "Paciente Secreto" });
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    await trpc(ana.page, "appointment.create", {
        patientId,
        date: date.toISOString(),
        startTime: "07:00",
        endTime: "07:50",
        status: "confirmed",
        sessionType: "in_person",
        type: "individual",
        isRecurring: false,
        roomId: room.id,
        notes: "nota privada",
    });

    await bia.page.goto("/agendamento");
    await bia.page.locator("#tab-day-view").click();
    await expect(bia.page.getByText("Consulta reservada").first()).toBeVisible();
    await expect(bia.page.getByText("Paciente Secreto")).toHaveCount(0);
    await expect(bia.page.getByText("nota privada")).toHaveCount(0);

    await bia.page.getByLabel("Só os meus agendamentos").click();
    await expect(bia.page.getByText("Consulta reservada")).toHaveCount(0);

    await ana.context.close();
    await bia.context.close();
});
