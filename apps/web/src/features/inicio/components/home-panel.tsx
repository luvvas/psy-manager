import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomePanelProps {
    title: string;
    description: string;
    /** Link no canto do painel ("Ver agenda", "Ver todos"...). */
    action?: { label: string; to: string };
    /** Mostrado no lugar de children quando não há itens. */
    empty?: { icon: LucideIcon; title: string; description: string };
    isEmpty?: boolean;
    children?: React.ReactNode;
}

/** Moldura comum dos blocos da tela inicial: cabeçalho, lista e estado vazio. */
export function HomePanel({ title, description, action, empty, isEmpty, children }: HomePanelProps) {
    const EmptyIcon = empty?.icon;

    return (
        <div className="flex h-full flex-col rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="truncate text-xs text-muted-foreground">{description}</p>
                </div>
                {action && (
                    <Button variant="ghost" size="sm" className="shrink-0 gap-1.5" asChild>
                        <Link to={action.to}>
                            {action.label}
                            <ArrowRight className="size-3.5" />
                        </Link>
                    </Button>
                )}
            </div>

            {isEmpty && empty && EmptyIcon ? (
                <div className="m-4 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 px-4 py-8 text-center">
                    <EmptyIcon className="mb-3 size-10 text-muted-foreground opacity-20" />
                    <h3 className="font-medium">{empty.title}</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">{empty.description}</p>
                </div>
            ) : (
                children
            )}
        </div>
    );
}

/** Rodapé "+N mais" quando a lista foi cortada. */
export function MoreItems({ count, to }: { count: number; to: string }) {
    if (count <= 0) return null;
    return (
        <Link
            to={to}
            className="block border-t px-4 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
            +{count} {count === 1 ? "outro" : "outros"}
        </Link>
    );
}
