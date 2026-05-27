import {
    Target,
} from "lucide-react";

export function TabSobre() {
    return (
        <div className="mx-auto max-w-3xl px-6 py-20 space-y-16">
            <section className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Sobre o psy-manager</h2>
                <p className="text-muted-foreground leading-relaxed">
                    O <strong className="text-foreground">psy-manager</strong> nasceu de dois fatores: a
                    necessidade real de psicólogos brasileiros terem uma ferramenta prática e centralizada
                    para a gestão do consultório, e a vontade do desenvolvedor de construir algo com impacto
                    real na comunidade — ganhando experiência profissional resolvendo um problema genuíno,
                    não apenas um projeto de portfólio.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                    A plataforma é voltada principalmente para psicólogos autônomos e profissionais que
                    atuam em clínicas compartilhadas, oferecendo controle total sobre agenda, pacientes,
                    prontuários, finanças e documentos — tudo em um só lugar, no navegador, sem
                    instalação.
                </p>
            </section>

            <section className="space-y-6">
                <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    <Target className="size-5 text-primary" />
                    Propósito
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        {
                            title: "Praticidade",
                            text: "Interface densa, escaneável e eficiente. Nada de telas desnecessárias — cada clique leva ao que importa.",
                        },
                        {
                            title: "Privacidade",
                            text: "Dados clínicos são tratados como privados por padrão. Cada psicólogo vê somente o que é seu.",
                        },
                        {
                            title: "Contexto local",
                            text: "Pensado para o Brasil: CRP, CPF, formatos de contato e linguagem completamente em português.",
                        },
                    ].map(({ title, text }) => (
                        <div key={title} className="rounded-xl border bg-card p-5 space-y-2">
                            <p className="font-semibold text-sm">{title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
