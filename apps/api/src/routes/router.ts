import { router } from "../trpc/index";
import { psychologistRouter } from "./psychologist";
import { patientRouter } from "./patient";
import { appointmentRouter } from "./appointment";
import { clinicRouter } from "./clinic";
import { financialRouter } from "./financial";

export const appRouter = router({
    psychologist: psychologistRouter,
    patient: patientRouter,
    appointment: appointmentRouter,
    clinic: clinicRouter,
    financial: financialRouter,
});

export type AppRouter = typeof appRouter;
