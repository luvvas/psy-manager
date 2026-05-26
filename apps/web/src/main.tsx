import * as Sentry from "@sentry/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import superjson from "superjson";
import "./index.css";
import { trpc } from "./lib/trpc";
import { router } from "./router";

import { Toaster } from "@/components/ui/sonner";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    const headers = event.request?.headers;
    if (headers) {
      for (const key of Object.keys(headers)) {
        if (/cookie|authorization|x-auth-token|password|token|auth/i.test(key)) {
          delete headers[key];
        }
      }
    }
    return event;
  },
});

function Root() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${import.meta.env.VITE_API_URL || ""}/trpc`,
          transformer: superjson,
          fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocorreu um erro inesperado.</p>}>
      <Root />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
