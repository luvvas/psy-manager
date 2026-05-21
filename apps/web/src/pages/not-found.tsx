import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { MapPinOff } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
    return (
        <>
            <AppHeader title="Página não encontrada" />
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                        <MapPinOff className="size-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-bold tracking-tight text-muted-foreground">404</p>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Página não encontrada
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            A página que você está procurando não existe ou foi movida.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link to="/agendamento">Voltar ao início</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
