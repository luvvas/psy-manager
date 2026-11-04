import { AppLayout } from "@/components/layout/app-layout";
import { PageLoader } from "@/components/page-loader";
import { RouteError } from "@/components/route-error";
import { AuthGuard, PublicOnlyGuard } from "@/features/auth/auth-guard";
import { NotFoundPage } from "@/pages/not-found";
import { pages } from "@/route-modules";
import { createBrowserRouter, Navigate } from "react-router-dom";

const appRoutes = [
    {
        path: "/login",
        element: <PublicOnlyGuard />,
        children: [
            {
                index: true,
                lazy: pages.auth,
            },
        ],
    },
    {
        path: "/redefinir-senha",
        lazy: pages.resetPassword,
    },
    {
        path: "/consulta/entrar/:token",
        lazy: pages.join,
    },
    {
        path: "/",
        element: <AuthGuard />,
        children: [
            {
                path: "consulta/:sessionId",
                lazy: pages.psychologistCall,
            },
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    {
                        path: "inicio",
                        lazy: pages.inicio,
                    },
                    {
                        path: "agendamento",
                        lazy: pages.agendamento,
                    },
                    {
                        path: "google-callback",
                        lazy: pages.googleCallback,
                    },
                    {
                        path: "pacientes",
                        lazy: pages.pacientes,
                    },
                    {
                        path: "pacientes/:id",
                        lazy: pages.pacienteDetalhes,
                    },
                    {
                        path: "clinicas",
                        lazy: pages.clinicas,
                    },
                    {
                        path: "financeiro",
                        lazy: pages.financeiro,
                    },
                    {
                        path: "documentos",
                        lazy: pages.documentos,
                    },
                    {
                        path: "documentos/:id",
                        lazy: pages.documentoDetalhes,
                    },
                    {
                        path: "pagamentos",
                        element: <Navigate to="/financeiro?aba=receber" replace />,
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
];

const webOnlyRoutes = [
    {
        path: "/",
        lazy: pages.landing,
    },
    {
        path: "/politica-de-privacidade",
        lazy: pages.privacidade,
    },
    {
        path: "/termos-de-uso",
        lazy: pages.termos,
    },
    {
        path: "*",
        element: <Navigate to="/" replace />,
    },
];

export const router = createBrowserRouter([
    {
        HydrateFallback: PageLoader,
        errorElement: <RouteError />,
        children: [...webOnlyRoutes, ...appRoutes],
    },
]);
