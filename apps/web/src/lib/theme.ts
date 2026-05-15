export interface ThemeConfig {
    /** AppHeader background color (hex) */
    primary?: string;
    /** Sidebar background color (hex) */
    sidebar?: string;
    /** Buttons and active nav-item color (hex) */
    button?: string;
}

/** Relative luminance (WCAG 2.1), used to auto-pick black or white foreground. */
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

export function applyTheme(config: ThemeConfig | null | undefined) {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    if (!config || (!isHex(config.primary) && !isHex(config.sidebar) && !isHex(config.button))) return;

    const vars: string[] = [];

    // ── AppHeader ─────────────────────────────────────────────────────────────
    if (isHex(config.primary)) {
        const fg = contrastHex(config.primary);
        vars.push(
            `--app-header-bg: ${config.primary}`,
            `--app-header-fg: ${fg}`,
            `--app-header-muted: color-mix(in srgb, ${fg} 60%, transparent)`,
            `--app-header-icon-bg: color-mix(in srgb, ${fg} 12%, transparent)`,
        );
    }

    // ── Sidebar background (sidebar header inherits this naturally) ───────────
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

    // ── Buttons & active nav items ────────────────────────────────────────────
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

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `:root, .dark {\n  ${vars.map((v) => v + ";").join("\n  ")}\n}`;
    document.head.appendChild(style);
}
