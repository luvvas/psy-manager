import { lazy, Suspense, useState } from "react";
import { Loader2, MessageSquareDot } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// O formulário (zod + react-hook-form) só baixa quando o diálogo abre.
const FeedbackForm = lazy(() => import("./feedback-form"));

interface FeedbackDialogProps {
    children: React.ReactNode;
}

export function FeedbackDialog({ children }: FeedbackDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquareDot className="size-4" />
                        Enviar feedback
                    </DialogTitle>
                </DialogHeader>
                <Suspense
                    fallback={
                        <div className="flex justify-center py-10">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    }
                >
                    <FeedbackForm onClose={() => setOpen(false)} />
                </Suspense>
            </DialogContent>
        </Dialog>
    );
}
