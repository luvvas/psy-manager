import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { ImagePlus, Loader2, MessageSquareDot, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { value: "confuso", label: "Está confuso" },
    { value: "nao_funciona", label: "Não funciona" },
    { value: "sugestao", label: "Sugestão" },
    { value: "outro", label: "Outro" },
] as const;

const feedbackSchema = z.object({
    category: z.enum(["confuso", "nao_funciona", "sugestao", "outro"], {
        required_error: "Selecione uma categoria",
    }),
    message: z
        .string()
        .min(5, "Descreva melhor o que aconteceu (mínimo 5 caracteres)")
        .max(1000, "Limite de 1000 caracteres"),
    screenshotBase64: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
            img.onload = () => {
                const MAX = 800;
                const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.65));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

interface FeedbackDialogProps {
    children: React.ReactNode;
}

export function FeedbackDialog({ children }: FeedbackDialogProps) {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema),
    });

    const selectedCategory = watch("category");

    const submit = trpc.feedback.submit.useMutation({
        onSuccess: () => {
            toast.success("Obrigado pelo feedback!");
            setOpen(false);
        },
        onError: () => {
            toast.error("Erro ao enviar feedback. Tente novamente.");
        },
    });

    const handleImageFile = async (file: File) => {
        if (!file.type.startsWith("image/")) return;
        setIsCompressing(true);
        try {
            const base64 = await compressImage(file);
            setValue("screenshotBase64", base64);
            setPreview(base64);
        } catch {
            toast.error("Não foi possível processar a imagem.");
        } finally {
            setIsCompressing(false);
        }
    };

    const removeImage = () => {
        setValue("screenshotBase64", undefined);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Paste screenshot from clipboard
    useEffect(() => {
        if (!open) return;
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) handleImageFile(file);
                    break;
                }
            }
        };
        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [open]);

    const onOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) {
            reset();
            setPreview(null);
        }
    };

    const onSubmit = async (data: FeedbackFormValues) => {
        await submit.mutateAsync({ ...data, page: location.pathname });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquareDot className="size-4" />
                        Enviar feedback
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
                    {/* Category */}
                    <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setValue("category", c.value, { shouldValidate: true })}
                                    className={cn(
                                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left",
                                        selectedCategory === c.value
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                    )}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        {errors.category && (
                            <p className="text-xs text-destructive">{errors.category.message}</p>
                        )}
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                        <Textarea
                            placeholder="Descreva o que aconteceu ou o que esperava que acontecesse..."
                            rows={4}
                            className="resize-none"
                            disabled={isSubmitting}
                            {...register("message")}
                        />
                        {errors.message && (
                            <p className="text-xs text-destructive">{errors.message.message}</p>
                        )}
                    </div>

                    {/* Screenshot */}
                    <div className="space-y-1.5">
                        {preview ? (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Screenshot"
                                    className="w-full rounded-lg border object-cover max-h-40"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/80 border shadow-sm hover:bg-background"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isCompressing}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
                            >
                                {isCompressing ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <ImagePlus className="size-3.5" />
                                )}
                                {isCompressing ? "Processando..." : "Anexar screenshot · ou Cole (Ctrl+V)"}
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFile(file);
                            }}
                        />
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting || isCompressing}>
                            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Enviar feedback
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
