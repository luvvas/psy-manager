import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { AgendamentoPage } from "@/features/agendamento";
import { PacientesPage } from "@/features/pacientes";
import { ClinicasPage } from "@/features/clinicas";
import { ComingSoonPage } from "@/pages/coming-soon";
import { AuthPage } from "@/features/auth/page";
import { AuthGuard, PublicOnlyGuard } from "@/features/auth/auth-guard";
import { GoogleCallbackPage } from "@/pages/google-callback";
import {
    DollarSign,
    CreditCard,
    FileText,
    ClipboardList,
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
                        path: "clinicas",
                        element: <ClinicasPage />,
                    },
                    {
                        path: "financeiro",
                        element: (
                            <ComingSoonPage
                                title="Controle Financeiro"
                                description="Acompanhe receitas, despesas e gere relatórios financeiros do consultório."
                                icon={DollarSign}
                            />
                        ),
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
                        element: (
                            <ComingSoonPage
                                title="Contratos Personalizados"
                                description="Crie e gerencie contratos terapêuticos personalizados para seus pacientes."
                                icon={FileText}
                            />
                        ),
                    },
                    {
                        path: "prontuarios",
                        element: (
                            <ComingSoonPage
                                title="Gestão de Prontuários"
                                description="Registre e consulte prontuários clínicos com segurança e praticidade."
                                icon={ClipboardList}
                            />
                        ),
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
