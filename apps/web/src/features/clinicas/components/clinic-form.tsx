import { logger } from "@/lib/logger";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCNPJ, formatPhone } from "@/utils/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const clinicSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    cnpj: z.string().min(14, "CNPJ inválido (mínimo de 14 dígitos)"),
    phone: z.string().min(10, "Telefone inválido"),
    email: z.string().min(1, "O e-mail é obrigatório").email("Formato de e-mail inválido"),
    address: z.string().min(5, "O endereço é obrigatório"),
    city: z.string().min(2, "A cidade é obrigatória"),
});

export type ClinicFormValues = z.infer<typeof clinicSchema>;

interface Psychologist {
    id: string;
    name: string;
    email: string;
    phone: string | null;
}

interface NewClinicFormProps {
    onSave: (data: ClinicFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: ClinicFormValues & { id?: string; psychologists?: Psychologist[] };
    onLinkPsychologist?: (email: string) => Promise<void>;
    onUnlinkPsychologist?: (id: string) => Promise<void>;
}

export function NewClinicForm({
    onSave,
    onCancel,
    initialData,
    onLinkPsychologist,
    onUnlinkPsychologist,
}: NewClinicFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPsyEmail, setNewPsyEmail] = useState("");
    const [isLinking, setIsLinking] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ClinicFormValues>({
        resolver: zodResolver(clinicSchema),
        defaultValues: initialData || {
            name: "",
            cnpj: "",
            phone: "",
            email: "",
            address: "",
            city: "",
        },
    });

    const cnpjWatch = watch("cnpj");
    const phoneWatch = watch("phone");

    const onSubmitForm = async (data: ClinicFormValues) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
        } catch (error) {
            logger.error("Failed to save clinic", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddPsychologist = async () => {
        if (!newPsyEmail || !onLinkPsychologist) return;
        setIsLinking(true);
        try {
            await onLinkPsychologist(newPsyEmail);
            setNewPsyEmail("");
            toast.success("Psicólogo adicionado com sucesso!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar psicólogo");
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <Tabs defaultValue="dados" className="flex flex-col h-full w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="psicologos" disabled={!initialData?.id}>
                    Psicólogos
                </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col space-y-4 pt-1">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Nome da Clínica</Label>
                            <Input
                                id="name"
                                disabled={isSubmitting}
                                placeholder="Clínica Harmonia"
                                {...register("name")}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cnpj">CNPJ</Label>
                                <Input
                                    id="cnpj"
                                    disabled={isSubmitting}
                                    placeholder="12.345.678/0001-00"
                                    value={cnpjWatch}
                                    onChange={(e) => {
                                        setValue("cnpj", formatCNPJ(e.target.value), {
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                {errors.cnpj && (
                                    <p className="text-xs text-destructive">{errors.cnpj.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    disabled={isSubmitting}
                                    placeholder="(41) 3333-3333"
                                    value={phoneWatch}
                                    onChange={(e) => {
                                        setValue("phone", formatPhone(e.target.value), {
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                {errors.phone && (
                                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                disabled={isSubmitting}
                                placeholder="contato@clinicaharmonia.com"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="address">Endereço</Label>
                                <Input
                                    id="address"
                                    disabled={isSubmitting}
                                    placeholder="Av. Sete de Setembro, 1234"
                                    {...register("address")}
                                />
                                {errors.address && (
                                    <p className="text-xs text-destructive">{errors.address.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="city">Cidade</Label>
                                <Input
                                    id="city"
                                    disabled={isSubmitting}
                                    placeholder="Curitiba"
                                    {...register("city")}
                                />
                                {errors.city && (
                                    <p className="text-xs text-destructive">{errors.city.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4 w-full">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Salvar
                        </Button>
                    </div>
                </form>
            </TabsContent>

            <TabsContent value="psicologos" className="flex-1 flex flex-col space-y-4 pt-1">
                {initialData?.id && onLinkPsychologist && onUnlinkPsychologist && (
                    <div className="space-y-4">
                        {/* Add psychologist input */}
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="email.do.psicologo@email.com"
                                value={newPsyEmail}
                                onChange={(e) => setNewPsyEmail(e.target.value)}
                                disabled={isLinking}
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddPsychologist}
                                disabled={isLinking || !newPsyEmail}
                                className="gap-1.5 shrink-0"
                            >
                                {isLinking ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <UserPlus className="size-4" />
                                )}
                                Vincular
                            </Button>
                        </div>

                        {/* Psychologists list */}
                        <div className="rounded-lg border bg-muted/20 divide-y max-h-[350px] overflow-y-auto">
                            {(initialData.psychologists || []).map((psy) => (
                                <div key={psy.id} className="flex items-center justify-between p-3 text-sm">
                                    <div className="space-y-0.5">
                                        <p className="font-medium text-foreground">{psy.name}</p>
                                        <p className="text-xs text-muted-foreground">{psy.email}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-destructive hover:bg-destructive/10"
                                        onClick={async () => {
                                            if (window.confirm(`Remover vínculo de ${psy.name}?`)) {
                                                try {
                                                    await onUnlinkPsychologist(psy.id);
                                                    toast.success("Psicólogo removido com sucesso!");
                                                } catch (error: any) {
                                                    toast.error(error.message || "Erro ao desvincular");
                                                }
                                            }
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                            {(initialData.psychologists || []).length === 0 && (
                                <p className="p-4 text-center text-xs text-muted-foreground">
                                    Nenhum psicólogo vinculado além do proprietário.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
