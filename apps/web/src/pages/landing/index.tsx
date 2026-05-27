import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TabFuncionalidades } from "./tab-funcionalidades";
import { TabInicio } from "./tab-inicio";
import { TabSobre } from "./tab-sobre";

type Tab = "inicio" | "funcionalidades" | "sobre";

const tabLabels: Record<Tab, string> = {
    inicio: "Início",
    funcionalidades: "Funcionalidades",
    sobre: "Sobre",
};

export function LandingGuard() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (session) {
        return <Navigate to="/agendamento" replace />;
    }

    return <LandingPage />;
}

export function LandingPage() {
    const [tab, setTab] = useState<Tab>("inicio");

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Nav */}
            <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
                <div className="mx-auto max-w-5xl px-6 flex items-center justify-between gap-4">
                    {/* Logo + tabs */}
                    <div className="flex items-center gap-4 overflow-x-auto">
                        <div className="flex items-center gap-2.5 py-4 shrink-0">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Brain className="size-4" />
                            </div>
                            <span className="font-bold tracking-tight">psy-manager</span>
                        </div>

                        <nav className="flex items-center">
                            {(Object.keys(tabLabels) as Tab[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTab(t)}
                                    className={cn(
                                        "px-3 py-4 text-sm whitespace-nowrap border-b-2 transition-colors",
                                        tab === t
                                            ? "border-primary font-medium text-foreground"
                                            : "border-transparent text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {tabLabels[t]}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Auth actions */}
                    <div className="flex items-center gap-3 py-4 shrink-0">
                        <Link to="/login">
                            <Button variant="ghost" size="sm">
                                Entrar
                            </Button>
                        </Link>
                        <Link to="/login?tab=register">
                            <Button size="sm">Criar conta</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {tab === "inicio" && <TabInicio />}
            {tab === "funcionalidades" && <TabFuncionalidades />}
            {tab === "sobre" && <TabSobre />}

            {/* Footer */}
            <footer className="border-t">
                <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="flex aspect-square size-5 items-center justify-center rounded bg-primary text-primary-foreground">
                            <Brain className="size-3" />
                        </div>
                        <span>psy-manager</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <p>Gestão clínica para psicólogos brasileiros.</p>
                        <Link to="/atualizacoes" className="hover:text-foreground transition-colors">
                            Atualizações
                        </Link>
                        <Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">
                            Privacidade
                        </Link>
                        <Link to="/termos-de-uso" className="hover:text-foreground transition-colors">
                            Termos
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
