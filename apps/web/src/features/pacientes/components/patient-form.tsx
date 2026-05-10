import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatCPF } from "@/utils/format";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const patientSchema = z.object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().min(1, "O e-mail é obrigatório").email("Formato de e-mail inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    dataNascimento: z.date({ required_error: "A data de nascimento é obrigatória" }),
    cidade: z.string().min(2, "A cidade é obrigatória"),
    cpf: z.string().min(11, "CPF inválido (mínimo de 11 dígitos)"),
    valorSessao: z.string().or(z.number()).optional(),
    modeloCobranca: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

interface NewPatientFormProps {
    onSave: (patient: PatientFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: any; // widened type to facilitate seamless Date-wrapping
}

export function NewPatientForm({ onSave, onCancel, initialData }: NewPatientFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            nome: initialData?.nome || "",
            email: initialData?.email || "",
            telefone: initialData?.telefone || "",
            dataNascimento: initialData?.dataNascimento ? new Date(initialData.dataNascimento) : undefined,
            cidade: initialData?.cidade || "",
            cpf: initialData?.cpf || "",
            valorSessao: initialData?.valorSessao || "",
            modeloCobranca: initialData?.modeloCobranca || "sessao_avulsa",
        },
    });

    const cpfWatch = watch("cpf");

    const onSubmitForm = async (data: PatientFormValues) => {
        setIsSubmitting(true);
        try {
            // Convert empty string back to undefined for the API if needed
            const submissionData = {
                ...data,
                valorSessao: data.valorSessao === "" ? undefined : data.valorSessao,
            };
            await onSave(submissionData);
        } catch (error) {
            console.error("Failed to save patient", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col h-full">
            <Tabs defaultValue="dados" className="flex-1 flex flex-col w-full space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="dados">Dados</TabsTrigger>
                    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="flex-1 space-y-4 overflow-y-auto pt-1">
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
                        <Controller
                            name="dataNascimento"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    date={field.value as any}
                                    setDate={field.onChange}
                                />
                            )}
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
                </TabsContent>

                <TabsContent value="financeiro" className="flex-1 space-y-6 pt-1">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="valorSessao">Valor da Sessão (R$)</Label>
                            <Input
                                id="valorSessao"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                disabled={isSubmitting}
                                {...register("valorSessao")}
                            />
                            {errors.valorSessao && (
                                <p className="text-xs text-destructive">{errors.valorSessao.message}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="modeloCobranca">Modelo de Cobrança</Label>
                            <Controller
                                name="modeloCobranca"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        disabled={isSubmitting}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o modelo de cobrança" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sessao_avulsa">Sessão Avulsa</SelectItem>
                                            <SelectItem value="pacote_mensal">Pacote Mensal</SelectItem>
                                            <SelectItem value="pacote_fechado">Pacote Fechado</SelectItem>
                                            <SelectItem value="plano_saude">Plano de Saúde</SelectItem>
                                            <SelectItem value="social">Valor Social</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.modeloCobranca && (
                                <p className="text-xs text-destructive">{errors.modeloCobranca.message}</p>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4 w-full">
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

