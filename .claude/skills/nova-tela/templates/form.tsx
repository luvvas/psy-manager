// MODELO — formulário renderizado dentro do AppSheet. Copie para components/<entidade>-form.tsx.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/utils/format";
import { logger } from "@/lib/logger";
// Outros controles prontos: DatePicker (@/components/date-picker),
// TimeInput (@/components/time-input), FileInput (@/components/file-input).

const schema = z.object({
    nome: z.string().min(2, "O nome é obrigatório"),
    registroAns: z.string().optional(),
    telefone: z.string().optional(),
});

export type HealthPlanFormValues = z.infer<typeof schema>;

interface HealthPlanFormProps {
    onSave: (values: HealthPlanFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: HealthPlanFormValues;
}

export function HealthPlanForm({ onSave, onCancel, initialData }: HealthPlanFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<HealthPlanFormValues>({
        resolver: zodResolver(schema),
        defaultValues: initialData ?? { nome: "", registroAns: "", telefone: "" },
    });

    const onSubmit = async (values: HealthPlanFormValues) => {
        setIsSubmitting(true);
        try {
            await onSave(values);
        } catch (error) {
            logger.error("Falha ao salvar convênio", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-4 pt-1">
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" disabled={isSubmitting} placeholder="Unimed" {...register("nome")} />
                    {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="registroAns">Registro ANS</Label>
                        <Input id="registroAns" disabled={isSubmitting} placeholder="000000" {...register("registroAns")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                            id="telefone"
                            disabled={isSubmitting}
                            placeholder="(41) 3333-3333"
                            value={watch("telefone") ?? ""}
                            onChange={(e) => setValue("telefone", formatPhone(e.target.value), { shouldValidate: true })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
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
