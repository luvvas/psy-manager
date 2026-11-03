import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfFileField } from "@/components/pdf-file-field";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod/v3";

const documentSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
    category: z.string().min(1, "Categoria é obrigatória"),
    patientId: z.string().min(1, "Paciente é obrigatório"),
});

type FormValues = z.infer<typeof documentSchema>;

export type ClinicalRecordFormValues = FormValues & { file?: File };

interface ClinicalRecordFormProps {
    onSave: (data: ClinicalRecordFormValues) => Promise<void>;
    onCancel: () => void;
    patients: { id: string; nome: string }[];
    initialData?: {
        title: string;
        category: string;
        patientId?: string | null;
    };
}

export function ClinicalRecordForm({ onSave, onCancel, patients, initialData }: ClinicalRecordFormProps) {
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
            logger.error("Erro ao salvar registro clínico", error);
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

                <PdfFileField
                    file={pdfFile}
                    error={fileError}
                    onChange={(file, error) => {
                        setPdfFile(file);
                        setFileError(error);
                    }}
                />
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
