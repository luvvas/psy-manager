import { Brain } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
        </section>
    );
}

interface LegalLayoutProps {
    title: string;
    updatedAt: string;
    children: ReactNode;
}

export function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
                <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Brain className="size-4" />
                        </div>
                        <span className="font-bold tracking-tight">psy-manager</span>
                    </Link>
                    <span className="text-muted-foreground text-sm">/ {title}</span>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
                </div>

                {children}
            </main>

            <footer className="border-t">
                <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <Link to="/" className="hover:text-foreground transition-colors">
                        ← Voltar para o início
                    </Link>
                    <div className="flex gap-4">
                        <Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">
                            Política de Privacidade
                        </Link>
                        <Link to="/termos-de-uso" className="hover:text-foreground transition-colors">
                            Termos de Uso
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
