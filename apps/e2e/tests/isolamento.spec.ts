import { expect, newSession, test, trpc } from "./fixtures";

test("outra psicóloga não vê pacientes nem prontuário pela interface", async ({ browser }) => {
    const ana = await newSession(browser, "Ana Dona");
    const bia = await newSession(browser, "Bia Visitante");

    const { id } = await trpc<{ id: string }>(ana.page, "patient.create", { nome: "Paciente Sigiloso" });
    await ana.page.goto("/pacientes");
    await expect(ana.page.getByRole("cell", { name: /Paciente Sigiloso/ })).toBeVisible();

    await bia.page.goto("/pacientes");
    await expect(bia.page.getByText("Nenhum paciente encontrado")).toBeVisible();

    await bia.page.goto(`/pacientes/${id}`);
    await expect(bia.page.getByText("Paciente não encontrado")).toBeVisible();
    await expect(bia.page.getByText("Paciente Sigiloso")).toHaveCount(0);

    await ana.context.close();
    await bia.context.close();
});
