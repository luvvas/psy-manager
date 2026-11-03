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
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod/v3";

const genericDocumentSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
    type: z.string().min(1, "Tipo é obrigatório"),
    isTemplate: z.boolean(),
});

type FormValues = z.infer<typeof genericDocumentSchema>;

export type GenericDocumentFormValues = FormValues & { file?: File };

interface GenericDocumentFormProps {
    onSave: (data: GenericDocumentFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: {
        title: string;
        type: string;
        isTemplate: boolean;
    };
}

export function GenericDocumentForm({ onSave, onCancel, initialData }: GenericDocumentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(genericDocumentSchema),
        defaultValues: {
            title: initialData?.title || "",
            type: initialData?.type || "outro",
            isTemplate: initialData?.isTemplate ?? false,
        },
    });

    const onSubmit = async (data: FormValues) => {
        if (!initialData && !pdfFile) {
            setFileError("Você precisa selecionar um arquivo PDF para armazenamento.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...data,
                file: pdfFile || undefined,
            });
        } catch (error) {
            logger.error("Erro ao salvar documento", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 h-full py-2">
            <div className="flex-1 space-y-4 overflow-y-auto px-1">
                <div className="space-y-1.5">
                    <Label htmlFor="title">Título do Arquivo</Label>
                    <Input
                        id="title"
                        placeholder="Ex: Contrato de Prestação de Serviços V1"
                        {...register("title")}
                    />
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="type">Categoria</Label>
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contrato">Contrato</SelectItem>
                                    <SelectItem value="materiais">Material de Divulgação</SelectItem>
                                    <SelectItem value="formulario">Formulário</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                </div>

                <div className="flex items-center justify-between rounded-lg pr-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="isTemplate" className="text-sm font-medium">
                            Modelo
                        </Label>
                    </div>
                    <Controller
                        name="isTemplate"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="isTemplate"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                </div>

                <PdfFileField
                    label="Arquivo PDF"
                    file={pdfFile}
                    error={fileError}
                    hint={initialData ? "Deixe vazio para manter o arquivo salvo." : undefined}
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
