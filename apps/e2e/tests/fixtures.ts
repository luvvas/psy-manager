import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import postgres from "postgres";

const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://psy_test:psy_test@127.0.0.1:5433/psy_manager_e2e";

export const PASSWORD = "Senha@Teste123";

let counter = 0;
function uid() {
    counter++;
    return `${process.pid}${Date.now().toString(36)}${counter}`;
}

export function uniqueIp() {
    const n = Math.floor(Math.random() * 0xffffff);
    return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

export function uniqueEmail(prefix = "psi") {
    return `${prefix}.${uid()}@e2e.dev`;
}

export type Psychologist = { name: string; email: string; password: string };

export async function signUpVia(context: BrowserContext, name: string): Promise<Psychologist> {
    const email = uniqueEmail();
    const response = await context.request.post("/api/auth/sign-up/email", {
        data: { name, email, password: PASSWORD, crp: "06/123456", phone: "(11) 99999-0000", city: "São Paulo" },
    });
    expect(response.ok(), await response.text()).toBe(true);
    return { name, email, password: PASSWORD };
}

export async function newSession(browser: Browser, name: string) {
    const context = await browser.newContext({ extraHTTPHeaders: { "cf-connecting-ip": uniqueIp() } });
    const page = await context.newPage();
    page.on("dialog", (dialog) => dialog.accept());
    const user = await signUpVia(context, name);
    return { context, page, user };
}

export async function trpc<T = unknown>(page: Page, procedure: string, input: unknown): Promise<T> {
    const response = await page.request.post(`/trpc/${procedure}`, { data: { json: input } });
    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json();
    return body.result.data.json as T;
}

export async function trpcQuery<T = unknown>(page: Page, procedure: string, input?: unknown): Promise<T> {
    const query = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    const response = await page.request.get(`/trpc/${procedure}${query}`);
    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json();
    return body.result.data.json as T;
}

export async function enableFlagFor(page: Page, flag: string) {
    const me = await trpcQuery<{ id: string }>(page, "psychologist.me");
    const sql = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });
    try {
        await sql`insert into feature_flag_override (id, flag_key, psychologist_id, enabled)
                  values (${crypto.randomUUID()}, ${flag}, ${me.id}, true)
                  on conflict (flag_key, psychologist_id) do update set enabled = true`;
    } finally {
        await sql.end();
    }
}

type Fixtures = {
    psychologist: Psychologist;
};

export const test = base.extend<Fixtures>({
    extraHTTPHeaders: async ({}, use) => {
        await use({ "cf-connecting-ip": uniqueIp() });
    },
    page: async ({ page }, use) => {
        page.on("dialog", (dialog) => dialog.accept());
        await use(page);
    },
    psychologist: async ({ context }, use) => {
        await use(await signUpVia(context, "Ana Teste Silva"));
    },
});

export { expect };
