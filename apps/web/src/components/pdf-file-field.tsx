import type { ChangeEvent } from "react";
import { CheckCircle2, FileText, FileUp } from "lucide-react";
import { FileInput } from "@/components/file-input";
import { Label } from "@/components/ui/label";

const PDF_MIME_TYPE = "application/pdf";
const MAX_PDF_SIZE = 10 * 1024 * 1024;

function validatePdfFile(file: File): string | null {
    if (file.type !== PDF_MIME_TYPE) return "Por favor, selecione apenas arquivos PDF.";
    if (file.size > MAX_PDF_SIZE) return "O arquivo deve ter no máximo 10MB.";
    return null;
}

interface PdfFileFieldProps {
    id?: string;
    label?: string;
    file: File | null;
    error: string | null;
    hint?: string;
    onChange: (file: File | null, error: string | null) => void;
}

export function PdfFileField({
    id = "pdfFile",
    label = "Arquivo PDF",
    file,
    error,
    hint,
    onChange,
}: PdfFileFieldProps) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) {
            onChange(null, null);
            return;
        }
        const validationError = validatePdfFile(selected);
        onChange(validationError ? null : selected, validationError);
    };

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="flex items-center gap-1.5">
                <FileUp className="size-3.5" />
                {label}
            </Label>
            <FileInput id={id} accept={PDF_MIME_TYPE} onChange={handleChange} />
            {file ? (
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                </p>
            ) : hint ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="size-3" />
                    {hint}
                </p>
            ) : null}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
