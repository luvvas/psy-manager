import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ThemeConfig } from "@/lib/theme";
import { X } from "lucide-react";

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function ColorPickerField({
    label,
    description,
    value,
    onChange,
}: {
    label: string;
    description: string;
    value: string;
    onChange: (hex: string) => void;
}) {
    const valid = HEX_RE.test(value);

    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
            <div className="flex items-center gap-2">
                <label
                    className="relative size-9 shrink-0 rounded-md border-2 cursor-pointer overflow-hidden transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
                    style={{
                        borderColor: valid ? value : "var(--border)",
                        backgroundColor: valid ? value : "var(--muted)",
                    }}
                >
                    <input
                        type="color"
                        aria-label={label}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={valid ? value : "#000000"}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </label>

                <Input
                    value={value}
                    onChange={(e) => {
                        const v = e.target.value;
                        onChange(v.startsWith("#") ? v : `#${v}`);
                    }}
                    placeholder="#rrggbb"
                    className="font-mono text-sm flex-1"
                    maxLength={7}
                />

                {value && (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Remover cor"
                        aria-label="Remover cor"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

const FIELDS: { key: keyof ThemeConfig; label: string; description: string }[] = [
    { key: "primary", label: "Cor do Cabeçalho", description: "Fundo do cabeçalho das páginas" },
    { key: "sidebar", label: "Cor da Barra Lateral", description: "Fundo da barra de navegação" },
    { key: "tableHeader", label: "Cor do Cabeçalho das Tabelas", description: "Fundo do cabeçalho das tabelas de dados" },
    { key: "button", label: "Cor dos Botões", description: "Botões de ação e itens ativos na navegação" },
];

export function ProfileThemeFields({
    value,
    onChange,
}: {
    value: ThemeConfig;
    onChange: (key: keyof ThemeConfig, hex: string) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            {FIELDS.map((field) => (
                <ColorPickerField
                    key={field.key}
                    label={field.label}
                    description={field.description}
                    value={value[field.key] ?? ""}
                    onChange={(hex) => onChange(field.key, hex)}
                />
            ))}
        </div>
    );
}
