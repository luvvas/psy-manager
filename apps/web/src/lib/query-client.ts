import { QueryCache, QueryClient } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./trpc";

function httpStatusOf(error: unknown): number | undefined {
    if (!(error instanceof TRPCClientError)) return undefined;
    const data = error.data as { httpStatus?: number } | undefined;
    return data?.httpStatus;
}

// Instâncias de módulo (SPA, sem SSR): assim o logout consegue limpar o cache
// de fora da árvore React (ver lib/session.ts).
export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            // Sessão expirou com a tela aberta: em vez de cada tela mostrar erro,
            // volta para o login (o AuthGuard leva de volta à página depois).
            if (httpStatusOf(error) === 401 && window.location.pathname !== "/login") {
                queryClient.clear();
                window.location.assign("/login");
            }
        },
    }),
    defaultOptions: {
        queries: {
            // Erro do cliente (4xx: sem permissão, não encontrado, input inválido) não
            // melhora tentando de novo; falha de rede ou 5xx ganha uma segunda chance.
            // Substitui o `retry: false` que cada tela repetia.
            retry: (failureCount, error) => {
                const status = httpStatusOf(error);
                if (status !== undefined && status < 500) return false;
                return failureCount < 1;
            },
        },
        mutations: { retry: false },
    },
});

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${import.meta.env.VITE_API_URL || ""}/trpc`,
            transformer: superjson,
            fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
        }),
    ],
});
