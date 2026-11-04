import { defineConfig, devices } from "@playwright/test";

const TIME_ZONE = "America/Sao_Paulo";
process.env.TZ = TIME_ZONE;

const WEB_PORT = 5174;
const API_PORT = 3101;
const webUrl = `http://localhost:${WEB_PORT}`;

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
    timeout: 45_000,
    expect: { timeout: 10_000 },
    use: {
        baseURL: webUrl,
        locale: "pt-BR",
        timezoneId: TIME_ZONE,
        trace: "retain-on-failure",
        video: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                permissions: ["camera", "microphone", "clipboard-read", "clipboard-write"],
                launchOptions: {
                    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
                },
            },
        },
    ],
    webServer: [
        {
            command: "bun scripts/api-server.ts",
            url: `http://localhost:${API_PORT}/api/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            env: { E2E_API_PORT: String(API_PORT), E2E_WEB_URL: webUrl },
        },
        {
            command: `bun run --cwd ../web vite build && bun run --cwd ../web vite preview --port ${WEB_PORT} --strictPort`,
            url: webUrl,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            env: { API_PROXY_TARGET: `http://localhost:${API_PORT}`, VITE_API_URL: "", VITE_WS_URL: "", VITE_SENTRY_DSN: "" },
        },
    ],
});
