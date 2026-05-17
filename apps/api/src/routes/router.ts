import { router } from "../trpc/index";
import { psychologistRouter } from "./psychologist";
import { patientRouter } from "./patient";
import { appointmentRouter } from "./appointment";
import { clinicRouter } from "./clinic";
import { financialRouter } from "./financial";
import { documentRouter } from "./document";
import { clinicalRecordRouter } from "./clinical-record";
import { videoSessionRouter } from "./video-session";

export const appRouter = router({
    psychologist: psychologistRouter,
    patient: patientRouter,
    appointment: appointmentRouter,
    clinic: clinicRouter,
    financial: financialRouter,
    document: documentRouter,
    clinicalRecord: clinicalRecordRouter,
    videoSession: videoSessionRouter,
});

export type AppRouter = typeof appRouter;
