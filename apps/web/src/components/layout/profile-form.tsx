import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyTheme, type ThemeConfig } from "@/lib/theme";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v3";

const profileSchema = z.object({
    name: z.string().min(3, "Nome completo é obrigatório"),
    phone: z.string().optional().nullable(),
    crp: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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
                {/* Colored swatch — clicking opens the native color picker */}
                <label
                    className="relative size-9 shrink-0 rounded-md border-2 cursor-pointer overflow-hidden transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
                    style={{
                        borderColor: valid ? value : "var(--border)",
                        backgroundColor: valid ? value : "var(--muted)",
                    }}
                >
                    <input
                        type="color"
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={valid ? value : "#000000"}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </label>

                {/* Hex text input */}
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
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

interface ProfileFormProps {
    onSuccess?: () => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [themeConfig, setThemeConfig] = useState<ThemeConfig>({});
    const utils = trpc.useUtils();

    const { data: profile, isLoading } = trpc.psychologist.me.useQuery();

    const updateMutation = trpc.psychologist.updateProfile.useMutation({
        onSuccess: () => {
            toast.success("Perfil atualizado com sucesso!");
            utils.psychologist.me.invalidate();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar perfil: ${err.message}`);
        },
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: "", phone: "", crp: "", city: "" },
    });

    useEffect(() => {
        if (profile) {
            setThemeConfig((profile.themeConfig ?? {}) as ThemeConfig);
            reset({
                name: profile.name || "",
                phone: profile.phone || "",
                crp: profile.crp || "",
                city: profile.city || "",
            });
        }
    }, [profile, reset]);

    function handleColorChange(key: keyof ThemeConfig, hex: string) {
        const next = { ...themeConfig, [key]: hex };
        setThemeConfig(next);
        applyTheme(next);
    }

    const onSubmit = async (data: ProfileValues) => {
        setIsSubmitting(true);
        try {
            // Only persist valid hex values; strip partial/empty entries
            const config: ThemeConfig = {
                primary: HEX_RE.test(themeConfig.primary ?? "") ? themeConfig.primary : undefined,
                sidebar: HEX_RE.test(themeConfig.sidebar ?? "") ? themeConfig.sidebar : undefined,
                button: HEX_RE.test(themeConfig.button ?? "") ? themeConfig.button : undefined,
            };
            await updateMutation.mutateAsync({
                name: data.name,
                phone: data.phone || undefined,
                crp: data.crp || undefined,
                city: data.city || undefined,
                themeConfig: config,
            });
            applyTheme(config);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" {...register("name")} placeholder="Ex: Dr. João Silva" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="crp">CRP</Label>
                <Input id="crp" {...register("crp")} placeholder="Ex: 08/12345" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" {...register("phone")} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...register("city")} placeholder="Sua Cidade" />
                </div>
            </div>

            {/* ── Personalização Visual ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorPickerField
                    label="Cor do Cabeçalho"
                    description="Fundo do cabeçalho das páginas"
                    value={themeConfig.primary ?? ""}
                    onChange={(hex) => handleColorChange("primary", hex)}
                />
                <ColorPickerField
                    label="Cor da Barra Lateral"
                    description="Fundo da barra de navegação"
                    value={themeConfig.sidebar ?? ""}
                    onChange={(hex) => handleColorChange("sidebar", hex)}
                />
            </div>

            <ColorPickerField
                label="Cor dos Botões"
                description="Botões de ação e itens ativos na navegação"
                value={themeConfig.button ?? ""}
                onChange={(hex) => handleColorChange("button", hex)}
            />

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </form>
    );
}
