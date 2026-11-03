import { QueryCache, QueryClient } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./trpc";

function httpStatusOf(error: unknown): number | undefined {
    if (!(error instanceof TRPCClientError)) return undefined;
    const data = error.data as { httpStatus?: number } | undefined;
    return data?.httpStatus;
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            if (httpStatusOf(error) === 401 && window.location.pathname !== "/login") {
                queryClient.clear();
                window.location.assign("/login");
            }
        },
    }),
    defaultOptions: {
        queries: {
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
