import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatCPF } from "@/utils/format";
import { useState } from "react";

const patientSchema = z.object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().min(1, "O e-mail é obrigatório").email("Formato de e-mail inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    dataNascimento: z.string().min(1, "A data de nascimento é obrigatória"),
    cidade: z.string().min(2, "A cidade é obrigatória"),
    cpf: z.string().min(11, "CPF inválido (mínimo de 11 dígitos)"),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

interface NewPatientFormProps {
    onSave: (patient: PatientFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: PatientFormValues;
}

export function NewPatientForm({ onSave, onCancel, initialData }: NewPatientFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: initialData || {
            nome: "",
            email: "",
            telefone: "",
            dataNascimento: "",
            cidade: "",
            cpf: "",
        },
    });

    const cpfWatch = watch("cpf");

    const onSubmitForm = async (data: PatientFormValues) => {
        setIsSubmitting(true);
        try {
            await onSave(data);
        } catch (error) {
            console.error("Failed to save patient", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col h-full space-y-4">
            <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                        id="nome"
                        disabled={isSubmitting}
                        placeholder="Maria Silva"
                        {...register("nome")}
                    />
                    {errors.nome && (
                        <p className="text-xs text-destructive">{errors.nome.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                        id="email"
                        type="email"
                        disabled={isSubmitting}
                        placeholder="maria@email.com"
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                        id="telefone"
                        disabled={isSubmitting}
                        placeholder="(41) 99999-1111"
                        {...register("telefone")}
                    />
                    {errors.telefone && (
                        <p className="text-xs text-destructive">{errors.telefone.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                        id="dataNascimento"
                        type="date"
                        disabled={isSubmitting}
                        {...register("dataNascimento")}
                    />
                    {errors.dataNascimento && (
                        <p className="text-xs text-destructive">{errors.dataNascimento.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                        id="cidade"
                        disabled={isSubmitting}
                        placeholder="Curitiba"
                        {...register("cidade")}
                    />
                    {errors.cidade && (
                        <p className="text-xs text-destructive">{errors.cidade.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                        id="cpf"
                        disabled={isSubmitting}
                        placeholder="123.456.789-00"
                        value={cpfWatch}
                        onChange={(e) => {
                            setValue("cpf", formatCPF(e.target.value), {
                                shouldValidate: true,
                            });
                        }}
                    />
                    {errors.cpf && (
                        <p className="text-xs text-destructive">{errors.cpf.message}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-auto w-full">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Salvar Paciente
                </Button>
            </div>
        </form>
    );
}
