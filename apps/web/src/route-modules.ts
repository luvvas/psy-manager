export const pages = {
    auth: () => import("@/features/auth/page").then((m) => ({ Component: m.AuthPage })),
    resetPassword: () =>
        import("@/features/auth/reset-password-page").then((m) => ({ Component: m.ResetPasswordPage })),
    join: () => import("@/features/consulta").then((m) => ({ Component: m.JoinPage })),
    psychologistCall: () => import("@/features/consulta").then((m) => ({ Component: m.PsychologistPage })),
    inicio: () => import("@/features/inicio").then((m) => ({ Component: m.InicioPage })),
    agendamento: () => import("@/features/agendamento").then((m) => ({ Component: m.AgendamentoPage })),
    googleCallback: () => import("@/pages/google-callback").then((m) => ({ Component: m.GoogleCallbackPage })),
    pacientes: () => import("@/features/pacientes").then((m) => ({ Component: m.PacientesPage })),
    pacienteDetalhes: () => import("@/features/pacientes").then((m) => ({ Component: m.PatientDetailsPage })),
    clinicas: () => import("@/features/clinicas").then((m) => ({ Component: m.ClinicasPage })),
    financeiro: () => import("@/features/financeiro").then((m) => ({ Component: m.FinanceiroPage })),
    documentos: () => import("@/features/documentos").then((m) => ({ Component: m.DocumentosPage })),
    landing: () => import("@/pages/landing").then((m) => ({ Component: m.LandingGuard })),
    privacidade: () => import("@/pages/privacy-policy").then((m) => ({ Component: m.PrivacyPolicyPage })),
    termos: () => import("@/pages/terms-of-use").then((m) => ({ Component: m.TermsOfUsePage })),
};

const preloadByPath: Record<string, () => Promise<unknown>> = {
    "/inicio": pages.inicio,
    "/agendamento": pages.agendamento,
    "/pacientes": pages.pacientes,
    "/clinicas": pages.clinicas,
    "/financeiro": pages.financeiro,
    "/documentos": pages.documentos,
};

export function preloadRoute(path: string) {
    void preloadByPath[path]?.();
}
