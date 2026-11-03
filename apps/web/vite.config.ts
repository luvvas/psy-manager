import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

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
                      sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
                  }),
              ]
            : []),
    ],
    build: {
        sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "vendor-react",
                            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
                            priority: 2,
                        },
                        {
                            name: "vendor-data",
                            test: /[\\/]node_modules[\\/](@tanstack|@trpc|superjson|better-auth|@better-auth|@better-fetch|nanostores|@sentry|@sentry-internal)[\\/]/,
                            priority: 1,
                        },
                    ],
                },
            },
        },
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
