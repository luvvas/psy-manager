import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signOut } from "@/lib/auth-client";
import { applyTheme, type ThemeConfig } from "@/lib/theme";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, Palette, Shield, TriangleAlert, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [themeConfig, setThemeConfig] = useState<ThemeConfig>({});
    const utils = trpc.useUtils();
    const navigate = useNavigate();

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

    const { refetch: fetchExport, isFetching: isExporting } = trpc.psychologist.exportData.useQuery(undefined, {
        enabled: false,
    });

    const handleExport = async () => {
        const { data, error } = await fetchExport();
        if (error || !data) {
            toast.error("Erro ao exportar dados. Tente novamente.");
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `psy-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Dados exportados com sucesso!");
    };

    const deleteAccountMutation = trpc.psychologist.deleteAccount.useMutation({
        onSuccess: async () => {
            await signOut();
            navigate("/", { replace: true });
        },
        onError: (err) => {
            toast.error(`Erro ao excluir conta: ${err.message}`);
            setIsDeletingAccount(false);
        },
    });

    async function handleDeleteAccount() {
        setIsDeletingAccount(true);
        deleteAccountMutation.mutate();
    }

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
                tableHeader: HEX_RE.test(themeConfig.tableHeader ?? "") ? themeConfig.tableHeader : undefined,
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs defaultValue="perfil" className="flex-1 flex flex-col w-full space-y-4">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="perfil" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <User className="h-4 w-4" /> Perfil
                    </TabsTrigger>
                    <TabsTrigger value="customizacao" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <Palette className="h-4 w-4" /> Customização
                    </TabsTrigger>
                    <TabsTrigger value="seguranca" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <Shield className="h-4 w-4" /> Segurança
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab Perfil ──────────────────────────────────────────────── */}
                <TabsContent value="perfil" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
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
                </TabsContent>

                {/* ── Tab Customização ────────────────────────────────────────── */}
                <TabsContent value="customizacao" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <div className="flex flex-col gap-4">
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
                        <ColorPickerField
                            label="Cor do Cabeçalho das Tabelas"
                            description="Fundo do cabeçalho das tabelas de dados"
                            value={themeConfig.tableHeader ?? ""}
                            onChange={(hex) => handleColorChange("tableHeader", hex)}
                        />
                        <ColorPickerField
                            label="Cor dos Botões"
                            description="Botões de ação e itens ativos na navegação"
                            value={themeConfig.button ?? ""}
                            onChange={(hex) => handleColorChange("button", hex)}
                        />
                    </div>
                </TabsContent>

                {/* ── Tab Segurança ───────────────────────────────────────────── */}
                <TabsContent value="seguranca" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <div className="border rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium">Exportar meus dados</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Baixe uma cópia de todos os seus dados em formato JSON. O arquivo inclui
                            pacientes, prontuários, documentos, transações e agendamentos.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting
                                ? <Loader2 className="mr-2 size-4 animate-spin" />
                                : <Download className="mr-2 size-4" />}
                            {isExporting ? "Exportando..." : "Exportar meus dados"}
                        </Button>
                    </div>

                    <div className="border border-destructive/40 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-destructive">
                            <TriangleAlert className="size-4 shrink-0" />
                            <span className="text-sm font-semibold">Zona de Perigo</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            A exclusão da sua conta é permanente e não pode ser desfeita. Todos os seus dados
                            serão removidos: pacientes, prontuários, documentos, transações financeiras e
                            agendamentos.
                        </p>
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="destructive" size="sm">
                                    Excluir minha conta
                                </Button>
                            </DialogTrigger>
                            <DialogContent showCloseButton={!isDeletingAccount}>
                                <DialogHeader>
                                    <DialogTitle>Excluir conta permanentemente?</DialogTitle>
                                    <DialogDescription>
                                        Esta ação não pode ser desfeita. Os seguintes dados serão removidos
                                        definitivamente:
                                    </DialogDescription>
                                </DialogHeader>
                                <ul className="text-sm text-muted-foreground space-y-1 pl-4 list-disc">
                                    <li>Sua conta e dados de perfil</li>
                                    <li>Todos os pacientes cadastrados</li>
                                    <li>Prontuários e registros clínicos</li>
                                    <li>Documentos e arquivos</li>
                                    <li>Transações financeiras</li>
                                    <li>Agendamentos e sessões de vídeo</li>
                                </ul>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDeleteDialogOpen(false)}
                                        disabled={isDeletingAccount}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleDeleteAccount}
                                        disabled={isDeletingAccount}
                                    >
                                        {isDeletingAccount && <Loader2 className="mr-2 size-4 animate-spin" />}
                                        Excluir permanentemente
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4 w-full bg-background z-10">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </form>
    );
}
