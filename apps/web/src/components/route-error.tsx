import { useEffect } from "react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * errorElement da rota raiz: sem ele, um erro de render ou de carregamento de rota
 * caía na tela padrão do React Router, em inglês ("Unexpected Application Error!").
 */
export function RouteError() {
    const error = useRouteError();
    const isNotFound = isRouteErrorResponse(error) && error.status === 404;

    useEffect(() => {
        if (!isNotFound) logger.error("Erro ao renderizar a rota", error);
    }, [error, isNotFound]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                <TriangleAlert className="size-8 text-muted-foreground" />
            </div>
            <div className="max-w-md space-y-1">
                <h1 className="text-lg font-semibold">
                    {isNotFound ? "Página não encontrada" : "Algo deu errado"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isNotFound
                        ? "A página que você está procurando não existe ou foi movida."
                        : "Ocorreu um erro inesperado ao abrir esta tela. Recarregue a página; se continuar, envie um feedback."}
                </p>
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                    <Link to="/inicio">Voltar ao início</Link>
                </Button>
                <Button size="sm" onClick={() => window.location.reload()}>
                    Recarregar
                </Button>
            </div>
        </div>
    );
}
