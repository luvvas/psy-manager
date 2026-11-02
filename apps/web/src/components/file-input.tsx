import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileInputProps extends Omit<React.ComponentProps<"input">, "type"> {
    buttonLabel?: string;
    placeholder?: string;
}

/**
 * Input de arquivo com textos em português. O <input type="file"> nativo usa o
 * idioma do navegador ("Browse... No file selected" no Firefox) e o texto não
 * pode ser trocado por CSS, então ele fica escondido e é acionado por um botão.
 */
export function FileInput({
    className,
    buttonLabel = "Escolher arquivo",
    placeholder = "Nenhum arquivo selecionado",
    onChange,
    disabled,
    ...props
}: FileInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    return (
        <div
            className={cn(
                "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent pl-1 pr-2.5 dark:bg-input/30",
                disabled && "pointer-events-none opacity-50",
                className
            )}
        >
            <input
                {...props}
                ref={inputRef}
                type="file"
                className="sr-only"
                tabIndex={-1}
                disabled={disabled}
                onChange={(e) => {
                    const files = e.target.files;
                    setFileName(
                        files && files.length > 0
                            ? files.length === 1
                                ? files[0].name
                                : `${files.length} arquivos selecionados`
                            : null
                    );
                    onChange?.(e);
                }}
            />
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 shrink-0 gap-1.5"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
            >
                <Upload className="size-3.5" />
                {buttonLabel}
            </Button>
            <span
                className={cn(
                    "truncate text-sm",
                    fileName ? "text-foreground" : "text-muted-foreground"
                )}
            >
                {fileName ?? placeholder}
            </span>
        </div>
    );
}
