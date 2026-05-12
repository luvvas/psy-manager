import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { AgendamentoPage } from "@/features/agendamento";
import { PacientesPage, PatientDetailsPage } from "@/features/pacientes";
import { ClinicasPage } from "@/features/clinicas";
import { FinanceiroPage } from "@/features/financeiro";
import { DocumentosPage } from "@/features/documentos";
import { ComingSoonPage } from "@/pages/coming-soon";
import { AuthPage } from "@/features/auth/page";
import { AuthGuard, PublicOnlyGuard } from "@/features/auth/auth-guard";
import { GoogleCallbackPage } from "@/pages/google-callback";
import {
    CreditCard,
    FlaskConical,
    Search,
    Settings,
} from "lucide-react";

export const router = createBrowserRouter([
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
        path: "/",
        element: <AuthGuard />,
        children: [
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/agendamento" replace />,
                    },
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
                        path: "exames",
                        element: (
                            <ComingSoonPage
                                title="Aplicação de Exames"
                                description="Aplique e gerencie exames psicológicos com resultados integrados ao prontuário."
                                icon={FlaskConical}
                            />
                        ),
                    },
                    {
                        path: "buscar",
                        element: (
                            <ComingSoonPage
                                title="Buscar Psicólogos"
                                description="Encontre psicólogos em Curitiba por especialidade, localização e disponibilidade."
                                icon={Search}
                            />
                        ),
                    },
                    {
                        path: "configuracoes",
                        element: (
                            <ComingSoonPage
                                title="Configurações"
                                description="Personalize seu perfil, horários de atendimento e preferências do sistema."
                                icon={Settings}
                            />
                        ),
                    },
                ],
            },
        ],
    },
]);
