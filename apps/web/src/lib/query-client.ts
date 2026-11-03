import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./trpc";

// Instâncias de módulo (SPA, sem SSR): assim o logout consegue limpar o cache
// de fora da árvore React (ver lib/session.ts).
export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${import.meta.env.VITE_API_URL || ""}/trpc`,
            transformer: superjson,
            fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
        }),
    ],
});
