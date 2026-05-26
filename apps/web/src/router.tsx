import { AppLayout } from "@/components/layout/app-layout";
import { AgendamentoPage } from "@/features/agendamento";
import { AuthGuard, PublicOnlyGuard } from "@/features/auth/auth-guard";
import { AuthPage } from "@/features/auth/page";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";
import { ClinicasPage } from "@/features/clinicas";
import { JoinPage, PsychologistPage } from "@/features/consulta";
import { DocumentosPage } from "@/features/documentos";
import { FinanceiroPage } from "@/features/financeiro";
import { PacientesPage, PatientDetailsPage } from "@/features/pacientes";
import { AtualizacoesPage } from "@/pages/atualizacoes";
import { ComingSoonPage } from "@/pages/coming-soon";
import { GoogleCallbackPage } from "@/pages/google-callback";
import { LandingGuard } from "@/pages/landing";
import { NotFoundPage } from "@/pages/not-found";
import { PrivacyPolicyPage } from "@/pages/privacy-policy";
import { TermsOfUsePage } from "@/pages/terms-of-use";
import {
    CreditCard
} from "lucide-react";
import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingGuard />,
    },
    {
        path: "/atualizacoes",
        element: <AtualizacoesPage />,
    },
    {
        path: "/politica-de-privacidade",
        element: <PrivacyPolicyPage />,
    },
    {
        path: "/termos-de-uso",
        element: <TermsOfUsePage />,
    },
    {
        path: "/login",
        element: <PublicOnlyGuard />,
        children: [
            {
                index: true,
                element: <AuthPage />,
            },
        ],
    },
    {
        path: "/redefinir-senha",
        element: <ResetPasswordPage />,
    },
    {
        // Public patient join page — no auth required, no sidebar
        path: "/consulta/entrar/:token",
        element: <JoinPage />,
    },
    {
        path: "/",
        element: <AuthGuard />,
        children: [
            {
                // Fullscreen — no sidebar
                path: "consulta/:sessionId",
                element: <PsychologistPage />,
            },
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    {
                        path: "agendamento",
                        element: <AgendamentoPage />,
                    },
                    {
                        path: "google-callback",
                        element: <GoogleCallbackPage />,
                    },
                    {
                        path: "pacientes",
                        element: <PacientesPage />,
                    },
                    {
                        path: "pacientes/:id",
                        element: <PatientDetailsPage />,
                    },
                    {
                        path: "clinicas",
                        element: <ClinicasPage />,
                    },
                    {
                        path: "financeiro",
                        element: <FinanceiroPage />,
                    },
                    {
                        path: "documentos",
                        element: <DocumentosPage />,
                    },
                    {
                        path: "pagamentos",
                        element: (
                            <ComingSoonPage
                                title="Pagamentos"
                                description="Gerencie pagamentos de sessões, emita recibos e controle parcelas."
                                icon={CreditCard}
                            />
                        ),
                    },
                    {
                        path: "contratos",
                        element: <Navigate to="/documentos" replace />,
                    },
                    {
                        path: "prontuarios",
                        element: <Navigate to="/documentos" replace />,
                    },
                    {
                        path: "*",
                        element: <NotFoundPage />,
                    },
                ],
            },
        ],
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
]);
