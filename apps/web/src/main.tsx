import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./app";
import { applyTheme, loadCachedTheme } from "./lib/theme";

applyTheme(loadCachedTheme());

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

const LAST_RELOAD_KEY = "psy:chunk-reload-at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(LAST_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocorreu um erro inesperado.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
