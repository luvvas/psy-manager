// MODELO — tela de detalhe (/<slug>/:id). Copie para page-detalhes.tsx e registre a rota.
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, ShieldCheck } from "lucide-react";

export function ConvenioDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: item, isLoading } = trpc.healthPlan.getById.useQuery(
        { id: id! },
        { enabled: !!id }
    );

    if (isLoading) {
        return (
            <div className="flex-1 p-6">
                <Skeleton className="h-12 w-64 mb-6" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Convênio não encontrado</h2>
                <p className="text-muted-foreground mb-4">O convênio que você procura não existe ou foi removido.</p>
                <Button onClick={() => navigate("/convenios")}>Voltar para Convênios</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 h-full">
            <AppHeader
                title={item.nome}
                description="Frase curta sobre o que esta tela mostra"
                icon={ShieldCheck}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate("/convenios")} className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={() => { /* abrir sheet */ }}>
                            <Plus className="size-4" />
                            Novo Item
                        </Button>
                    </div>
                }
            />

            {/* min-h-0: sem ele o filho flex não encolhe e a rolagem interna não funciona. */}
            <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-auto">{/* conteúdo */}</div>
            </div>
        </div>
    );
}
