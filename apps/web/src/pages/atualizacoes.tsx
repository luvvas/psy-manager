import { changelog, changeTypeConfig } from "@/data/changelog";
import { cn } from "@/lib/utils";
import { Brain, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function AtualizacoesPage() {
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
                    <span className="text-muted-foreground text-sm">/ Atualizações</span>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-12">
                <div className="mb-12 space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Atualizações</h1>
                    <p className="text-sm text-muted-foreground">
                        Registro de melhorias, novas funcionalidades e correções ao longo do tempo.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute left-2.75 top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-10">
                        {changelog.map((entry) => (
                            <div key={entry.version} className="relative flex gap-5">
                                <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background mt-0.5">
                                    <span className="size-2 rounded-full bg-primary" />
                                </div>

                                <div className="flex-1 pb-2">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="font-semibold text-sm font-mono">
                                            v{entry.version}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {entry.date}
                                        </span>
                                        {entry.label && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                <Sparkles className="size-3" />
                                                {entry.label}
                                            </span>
                                        )}
                                    </div>

                                    <ul className="space-y-2">
                                        {entry.changes.map((change, i) => {
                                            const cfg = changeTypeConfig[change.type];
                                            return (
                                                <li key={i} className="flex items-start gap-2.5 text-sm">
                                                    <span
                                                        className={cn(
                                                            "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                            cfg.className,
                                                        )}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-muted-foreground leading-relaxed">
                                                        {change.text}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="mt-12 text-xs text-muted-foreground text-center">
                    Projeto iniciado em 6 de maio de 2026 · {changelog.length} versões lançadas
                </p>
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
