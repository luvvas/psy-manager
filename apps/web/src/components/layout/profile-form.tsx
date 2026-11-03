import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applyTheme, type ThemeConfig } from "@/lib/theme";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { validateWorkSchedule, type WorkSchedule } from "@/lib/work-schedule";
import { formatCRP, formatPhone } from "@/utils/format";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Loader2, Palette, Shield, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v3";
import { ProfileSecuritySection } from "./profile-security-section";
import { HEX_RE, ProfileThemeFields } from "./profile-theme-fields";
import { WorkScheduleEditor } from "./work-schedule-editor";

const profileSchema = z.object({
    name: z.string().min(3, "Nome completo é obrigatório"),
    phone: z.string().optional().nullable(),
    crp: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
});

type ProfileValues = z.infer<typeof profileSchema>;

type Profile = NonNullable<RouterOutputs["psychologist"]["me"]>;

interface ProfileFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

function fromProfile(profile: Profile): ProfileValues {
    return {
        name: profile.name || "",
        phone: formatPhone(profile.phone || ""),
        crp: formatCRP(profile.crp || ""),
        city: profile.city || "",
    };
}

function validHex(value: string | undefined) {
    return value && HEX_RE.test(value) ? value : undefined;
}

export function ProfileForm({ onSuccess, onCancel }: ProfileFormProps) {
    const { data: profile, isLoading } = trpc.psychologist.me.useQuery();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Não foi possível carregar o perfil. Tente novamente.
            </p>
        );
    }

    return <ProfileFormFields key={profile.id} profile={profile} onSuccess={onSuccess} onCancel={onCancel} />;
}

function ProfileFormFields({ profile, onSuccess, onCancel }: ProfileFormProps & { profile: Profile }) {
    const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => (profile.themeConfig ?? {}) as ThemeConfig);
    const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(() => profile.workSchedule ?? null);
    const [activeTab, setActiveTab] = useState("perfil");
    const savedThemeRef = useRef<ThemeConfig | null>((profile.themeConfig ?? null) as ThemeConfig | null);
    const previewingRef = useRef(false);
    const utils = trpc.useUtils();

    const updateMutation = trpc.psychologist.updateProfile.useMutation({
        onSuccess: (_data, variables) => {
            const saved = variables.themeConfig ?? null;
            savedThemeRef.current = saved;
            previewingRef.current = false;
            applyTheme(saved);
            toast.success("Perfil atualizado com sucesso!");
            utils.psychologist.me.invalidate();
            utils.appointment.freeSlots.invalidate();
            utils.appointment.checkSlot.invalidate();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar perfil: ${err.message}`);
        },
    });
    const isSubmitting = updateMutation.isPending;

    const { register, control, handleSubmit, formState: { errors } } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: fromProfile(profile),
    });

    useEffect(
        () => () => {
            if (previewingRef.current) applyTheme(savedThemeRef.current);
        },
        []
    );

    function handleColorChange(key: keyof ThemeConfig, hex: string) {
        previewingRef.current = true;
        const next = { ...themeConfig, [key]: hex };
        setThemeConfig(next);
        applyTheme(next);
    }

    const onSubmit = (data: ProfileValues) => {
        const scheduleError = workSchedule ? validateWorkSchedule(workSchedule) : null;
        if (scheduleError) {
            setActiveTab("expediente");
            toast.error(scheduleError);
            return;
        }
        updateMutation.mutate({
            name: data.name,
            phone: data.phone || undefined,
            crp: data.crp || undefined,
            city: data.city || undefined,
            themeConfig: {
                primary: validHex(themeConfig.primary),
                sidebar: validHex(themeConfig.sidebar),
                button: validHex(themeConfig.button),
                tableHeader: validHex(themeConfig.tableHeader),
            },
            workSchedule,
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full space-y-4">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="perfil" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <User className="h-4 w-4" /> Perfil
                    </TabsTrigger>
                    <TabsTrigger value="expediente" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <Clock className="h-4 w-4" /> Expediente
                    </TabsTrigger>
                    <TabsTrigger value="customizacao" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <Palette className="h-4 w-4" /> Customização
                    </TabsTrigger>
                    <TabsTrigger value="seguranca" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <Shield className="h-4 w-4" /> Segurança
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" {...register("name")} placeholder="Ex: Dr. João Silva" />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="crp">CRP</Label>
                        <Controller
                            control={control}
                            name="crp"
                            render={({ field }) => (
                                <Input
                                    id="crp"
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(formatCRP(e.target.value))}
                                    inputMode="numeric"
                                    placeholder="Ex: 08/12345"
                                />
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field }) => (
                                    <Input
                                        id="phone"
                                        ref={field.ref}
                                        name={field.name}
                                        onBlur={field.onBlur}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                        type="tel"
                                        inputMode="tel"
                                        placeholder="(00) 00000-0000"
                                    />
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">Cidade</Label>
                            <Input id="city" {...register("city")} placeholder="Sua Cidade" />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="expediente" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <WorkScheduleEditor value={workSchedule} onChange={setWorkSchedule} />
                </TabsContent>

                <TabsContent value="customizacao" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <ProfileThemeFields value={themeConfig} onChange={handleColorChange} />
                </TabsContent>

                <TabsContent value="seguranca" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <ProfileSecuritySection />
                </TabsContent>
            </Tabs>

            <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Salvar
                </Button>
            </div>
        </form>
    );
}
