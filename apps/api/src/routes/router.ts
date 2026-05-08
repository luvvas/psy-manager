import { router } from "../trpc/index";
import { psychologistRouter } from "./psychologist";
import { patientRouter } from "./patient";
import { appointmentRouter } from "./appointment";
import { clinicRouter } from "./clinic";

export const appRouter = router({
    psychologist: psychologistRouter,
    patient: patientRouter,
    appointment: appointmentRouter,
    clinic: clinicRouter,
});

export type AppRouter = typeof appRouter;
