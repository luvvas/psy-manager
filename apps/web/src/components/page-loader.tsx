import { Loader2 } from "lucide-react";

/** Tela cheia com spinner: primeira carga de uma rota lazy (HydrateFallback do router). */
export function PageLoader() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
        </div>
    );
}
