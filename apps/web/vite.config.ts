import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        ...(process.env.SENTRY_AUTH_TOKEN
            ? [
                  sentryVitePlugin({
                      authToken: process.env.SENTRY_AUTH_TOKEN,
                      org: process.env.SENTRY_ORG,
                      project: process.env.SENTRY_PROJECT,
                      // Os mapas só servem ao Sentry: apaga depois do upload para não
                      // irem para a imagem do nginx (dist/ é copiado inteiro).
                      sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
                  }),
              ]
            : []),
    ],
    build: {
        // Só gera mapas quando há upload para o Sentry (CI). "hidden" não deixa o
        // comentário sourceMappingURL nos .js, então o navegador nem procura os mapas.
        sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/trpc": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
            "/api/auth": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
    },
});
