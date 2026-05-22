import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CheckCircle, FileText, FileUp, Loader2 } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod/v3";

const genericDocumentSchema = z.object({
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
    type: z.string().min(1, "Tipo é obrigatório"),
    isTemplate: z.boolean(),
});

type FormValues = z.infer<typeof genericDocumentSchema>;

interface GenericDocumentFormProps {
    onSave: (data: any) => Promise<void>;
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

                <Label htmlFor="pdfFile" className="pt-2">
                    <FileUp className="w-4 h-4" /> Upload do Arquivo
                </Label>

                <div className="grid w-full max-w-sm items-center gap-1.5">
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
                        <FileText className="w-3 h-3" /> Deixe vazio para manter o arquivo salvo.
                    </p>
                )}

                {pdfFile && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-2">
                        <CheckCircle className="w-3 h-3" /> Pronto para upload: {pdfFile.name}
                    </p>
                )}

                {fileError && (
                    <p className="text-xs text-destructive font-medium mt-1">{fileError}</p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t bg-background mt-auto sticky bottom-0">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Salvar Documento
                </Button>
            </div>
        </form>
    );
}
