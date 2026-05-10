import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { DatePicker } from "@/components/date-picker";

const transactionSchema = z.object({
    type: z.enum(["income", "expense"]),
    description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
    amount: z.string().min(1, "Valor é obrigatório").refine((val) => !isNaN(Number(val)), "Formato inválido"),
    date: z.date({ required_error: "Data é obrigatória" }),
    category: z.string().optional(),
    patientId: z.string().optional().nullable(),
    status: z.enum(["paid", "pending"]),
});

type FormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
    type?: "income" | "expense";
    initialData?: any;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}

export function TransactionForm({ type, initialData, onSave, onCancel }: TransactionFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch patients for the selector
    const { data: patients } = trpc.patient.list.useQuery();

    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: initialData?.type || type || "income",
            description: initialData?.description || "",
            amount: initialData?.amount ? String(initialData.amount) : "",
            date: initialData?.date ? new Date(initialData.date) : new Date(),
            category: initialData?.category || "",
            patientId: initialData?.patientId || "",
            status: initialData?.status || "paid",
        },
    });

    const currentType = watch("type");

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            await onSave({
                ...data,
                amount: Number(data.amount),
                patientId: data.patientId === "none" || data.patientId === "" ? null : data.patientId,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
                <Label htmlFor="type">Tipo</Label>
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="income">Receita (+)</SelectItem>
                                <SelectItem value="expense">Despesa (-)</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" placeholder="Ex: Aluguel, Sessão com fulano" {...register("description")} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input id="amount" type="number" step="0.01" placeholder="0.00" {...register("amount")} />
                    {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="date">Data</Label>
                    <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                date={field.value}
                                setDate={field.onChange}
                            />
                        )}
                    />
                    {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
            </div>

            {currentType === "income" && (
                <div className="space-y-1.5">
                    <Label htmlFor="patientId">Vincular Paciente (Opcional)</Label>
                    <Controller
                        name="patientId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || "none"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum vínculo</SelectItem>
                                    {(patients || []).map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor="category">Categoria</Label>
                    <Input id="category" placeholder="Ex: Sessão, Luz" {...register("category")} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="status">Situação</Label>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">
                                        {currentType === "income" ? "Recebido" : "Pago"}
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        {currentType === "income" ? "A Receber" : "A Pagar"}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                </Button>
            </div>
        </form>
    );
}
