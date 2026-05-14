import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileUp, FileText } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const documentSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
    category: z.string().min(1, "Categoria é obrigatória"),
    patientId: z.string().min(1, "Paciente é obrigatório"),
});

type FormValues = z.infer<typeof documentSchema>;

interface DocumentFormProps {
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
    patients: { id: string; nome: string }[];
    initialData?: {
        title: string;
        category: string;
        patientId?: string | null;
    };
}

export function DocumentForm({ onSave, onCancel, patients, initialData }: DocumentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(documentSchema),
        defaultValues: {
            title: initialData?.title || "",
            category: initialData?.category || "evolucao",
            patientId: initialData?.patientId || "",
        },
    });

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError(null);

        if (!file) {
            setPdfFile(null);
            return;
        }

        if (file.type !== "application/pdf") {
            setFileError("Por favor, selecione apenas arquivos PDF.");
            setPdfFile(null);
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setFileError("O arquivo deve ter no máximo 10MB.");
            setPdfFile(null);
            return;
        }

        setPdfFile(file);
    };

    const onSubmit = async (data: FormValues) => {
        if (!initialData && !pdfFile) {
            setFileError("Você precisa selecionar um arquivo PDF.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...data,
                patientId: data.patientId,
                file: pdfFile || undefined,
            });
        } catch (error) {
            console.error("Erro ao salvar documento:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 h-full py-2">
            <div className="flex-1 space-y-4 overflow-y-auto px-1">
                <div className="space-y-1.5">
                    <Label htmlFor="title">Título do Documento</Label>
                    <Input
                        id="title"
                        placeholder="Ex: Prontuário de Maio"
                        {...register("title")}
                    />
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="category">Categoria</Label>
                    <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="evolucao">Evolução de Prontuário</SelectItem>
                                    <SelectItem value="contrato">Contrato</SelectItem>
                                    <SelectItem value="atestado">Atestado</SelectItem>
                                    <SelectItem value="laudo">Laudo / Parecer</SelectItem>
                                    <SelectItem value="documento_externo">Documento Externo</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="patientId">Paciente Associado</Label>
                    <Controller
                        name="patientId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patients.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.patientId && <p className="text-xs text-destructive">{errors.patientId.message}</p>}
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-muted/10">
                    <Label htmlFor="pdfFile" className="text-base font-semibold flex items-center gap-2">
                        <FileUp className="w-4 h-4" /> Arquivo PDF
                    </Label>

                    <div className="grid w-full max-w-sm items-center gap-1.5 pt-2">
                        <Input
                            id="pdfFile"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="cursor-pointer"
                        />
                    </div>

                    {initialData && !pdfFile && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                            <FileText className="w-3 h-3" /> Deixe em branco para manter o arquivo atual.
                        </p>
                    )}

                    {pdfFile && (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-2">
                            Pronto: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)}MB)
                        </p>
                    )}

                    {fileError && (
                        <p className="text-xs text-destructive font-medium mt-1">{fileError}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t bg-background mt-auto sticky bottom-0">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Salvar Registro
                </Button>
            </div>
        </form>
    );
}
