export interface ThemeConfig {
    primary?: string;
    sidebar?: string;
    button?: string;
    tableHeader?: string;
}

function luminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastHex(hex: string): string {
    return luminance(hex) > 0.179 ? "#0a0a0a" : "#fafafa";
}

function isHex(v: string | undefined): v is string {
    return !!v && /^#[0-9a-fA-F]{6}$/.test(v);
}

const STYLE_ID = "psy-theme";
const CACHE_KEY = "psy:theme:v1";
const THEME_KEYS = ["primary", "sidebar", "button", "tableHeader"] as const;

function pickValid(config: ThemeConfig | null | undefined): ThemeConfig | null {
    if (!config) return null;
    const result: ThemeConfig = {};
    let found = false;
    for (const key of THEME_KEYS) {
        const value = config[key];
        if (isHex(value)) {
            result[key] = value;
            found = true;
        }
    }
    return found ? result : null;
}

function saveCachedTheme(config: ThemeConfig | null) {
    try {
        if (config) localStorage.setItem(CACHE_KEY, JSON.stringify(config));
        else localStorage.removeItem(CACHE_KEY);
    } catch {
        return;
    }
}

export function loadCachedTheme(): ThemeConfig | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const record = parsed as Record<string, unknown>;
        const config: ThemeConfig = {};
        for (const key of THEME_KEYS) {
            const value = record[key];
            if (typeof value === "string") config[key] = value;
        }
        return pickValid(config);
    } catch {
        return null;
    }
}

export function clearCachedTheme() {
    saveCachedTheme(null);
}

export function applyTheme(input: ThemeConfig | null | undefined) {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const config = pickValid(input);
    saveCachedTheme(config);
    if (!config) return;

    const vars: string[] = [];

    if (isHex(config.primary)) {
        const fg = contrastHex(config.primary);
        vars.push(
            `--app-header-bg: ${config.primary}`,
            `--app-header-fg: ${fg}`,
            `--app-header-muted: color-mix(in srgb, ${fg} 60%, transparent)`,
            `--app-header-icon-bg: color-mix(in srgb, ${fg} 12%, transparent)`,
        );
    }

    if (isHex(config.sidebar)) {
        const fg = contrastHex(config.sidebar);
        vars.push(
            `--sidebar: ${config.sidebar}`,
            `--sidebar-foreground: ${fg}`,
            `--sidebar-accent: color-mix(in srgb, ${fg} 8%, transparent)`,
            `--sidebar-accent-foreground: ${fg}`,
            `--sidebar-border: color-mix(in srgb, ${fg} 12%, transparent)`,
        );
    }

    if (isHex(config.button)) {
        const fg = contrastHex(config.button);
        vars.push(
            `--primary: ${config.button}`,
            `--primary-foreground: ${fg}`,
            `--ring: ${config.button}`,
            `--sidebar-primary: ${config.button}`,
            `--sidebar-primary-foreground: ${fg}`,
            `--sidebar-ring: ${config.button}`,
        );
    }

    if (isHex(config.tableHeader)) {
        const fg = contrastHex(config.tableHeader);
        vars.push(
            `--table-header-bg: ${config.tableHeader}`,
            `--table-header-fg: ${fg}`,
        );
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `:root, .dark {\n  ${vars.map((v) => v + ";").join("\n  ")}\n}`;
    document.head.appendChild(style);
}
