import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    BarChart3,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
    FolderOpen,
    KeyRound,
    Server,
    ShieldCheck,
    Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const features = [
    {
        icon: Calendar,
        title: "Agendamento",
        description:
            "Calendário com visão diária, semanal e mensal. Sincronize com o Google Agenda e importe eventos automaticamente.",
    },
    {
        icon: Users,
        title: "Pacientes",
        description:
            "Cadastro completo de pacientes, histórico clínico, linha do tempo de prontuários e acesso rápido às informações.",
    },
    {
        icon: FileText,
        title: "Prontuário",
        description:
            "Registros clínicos com status de rascunho ou finalizado, anexo de PDFs e histórico organizado por sessão.",
    },
    {
        icon: BarChart3,
        title: "Financeiro",
        description:
            "Controle de fluxo de caixa, lançamentos de receitas e despesas, gráficos e importação via CSV.",
    },
    {
        icon: FolderOpen,
        title: "Documentos",
        description:
            "Biblioteca de documentos e modelos em PDF com upload, visualização, download e edição de metadados.",
    },
    {
        icon: Building2,
        title: "Clínicas",
        description:
            "Gerencie vínculos com clínicas compartilhadas e visualize agendamentos dos demais profissionais.",
    },
];

const benefits = [
    "Dados clínicos protegidos e privados",
    "Acesso via navegador — sem instalação",
    "Interface em português brasileiro",
    "Integração com Google Agenda",
];

const securityItems = [
    {
        icon: KeyRound,
        title: "Dados dos pacientes criptografados",
        description:
            "Nome, CPF, prontuários, documentos e dados financeiros dos seus pacientes são criptografados antes de serem salvos. Apenas você, autenticado na plataforma, consegue visualizá-los.",
    },
    {
        icon: ShieldCheck,
        title: "Cada psicólogo vê só o que é seu",
        description:
            "Seus pacientes, prontuários e registros financeiros são completamente isolados dos demais usuários da plataforma. Nenhum outro profissional tem acesso aos seus dados.",
    },
    {
        icon: Server,
        title: "Backup diário automático",
        description:
            "Seus dados são copiados automaticamente todos os dias. Se precisar, você pode baixar uma cópia completa a qualquer momento em Perfil → Exportar meus dados.",
    },
    {
        icon: FolderOpen,
        title: "Arquivos sempre privados",
        description:
            "Documentos e PDFs clínicos ficam em armazenamento seguro e são acessíveis apenas por links temporários gerados no momento do acesso — nunca ficam expostos publicamente.",
    },
];

const faqItems = [
    {
        question: "O psy-manager é gratuito?",
        answer:
            "Sim. Basta criar uma conta para começar a usar. Não há nenhum tipo de cobrança para cadastro ou uso dos módulos atuais.",
    },
    {
        question: "Preciso instalar algum programa?",
        answer:
            "Não. O psy-manager roda inteiramente no navegador — Chrome, Firefox, Edge ou Safari atualizado. Porém, também há a possibilidade de baixar o aplicativo.",
    },
    {
        question: "Meus dados ficam visíveis para outros psicólogos?",
        answer:
            "Não. Cada psicólogo enxerga somente seus próprios pacientes, prontuários, transações e documentos.",
    },
    {
        question: "Posso usar junto com minha clínica?",
        answer:
            "Sim. O módulo de Clínicas permite vincular profissionais a uma clínica por e-mail. Após o vínculo, você pode visualizar os agendamentos dos demais membros naquele espaço.",
    },
    {
        question: "Como faço para importar meus dados financeiros existentes?",
        answer:
            "O módulo Financeiro aceita importação de dados financeiros. Basta exportar do seu sistema atual no formato .csv e importar na tela de transações.",
    },
    {
        question: "Existe integração com o Google Agenda?",
        answer:
            "Sim. No módulo de Agendamento você pode conectar sua conta Google e importar eventos existentes. Os agendamentos criados no psy-manager também podem ser sincronizados.",
    },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
            >
                {question}
                {open ? (
                    <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
            </button>
            {open && (
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t bg-muted/20">
                    <p className="pt-3">{answer}</p>
                </div>
            )}
        </div>
    );
}

export function TabInicio() {
    return (
        <>
            {/* Hero */}
            <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
                <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4 sm:text-5xl">
                    O que você precisa para{" "}
                    <span className="text-primary">
                        gerenciar seu consultório, com a sua identidade
                    </span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                    Agendamento, prontuários, financeiro e documentos em um só lugar.
                    Simples, seguro e feito para psicólogos.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/login?tab=register">
                        <Button size="lg" className="gap-2">
                            Começar gratuitamente
                            <ArrowRight className="size-4" />
                        </Button>
                    </Link>
                    <Link to="/login">
                        <Button size="lg" variant="outline">
                            Já tenho uma conta
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Benefits strip */}
            <section className="border-y bg-muted/40">
                <div className="mx-auto max-w-5xl px-6 py-5">
                    <ul className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
                        {benefits.map((b) => (
                            <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                                {b}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Features */}
            <section className="mx-auto max-w-5xl px-6 py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Módulos integrados</h2>
                    <p className="text-muted-foreground">Cada recurso pensado para a rotina clínica real.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="rounded-xl border bg-card p-6 space-y-3 hover:border-primary/40 transition-colors"
                        >
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="size-5" />
                            </div>
                            <h3 className="font-semibold">{title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Segurança */}
            <section className="border-t bg-muted/30">
                <div className="mx-auto max-w-5xl px-6 py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-bold tracking-tight mb-2">Segurança dos dados</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            Dados clínicos são sensíveis. Cada camada do psy-manager foi pensada para
                            manter suas informações e as dos seus pacientes protegidas.
                        </p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {securityItems.map(({ icon: Icon, title, description }) => (
                            <div key={title} className="flex gap-4 rounded-xl border bg-card p-6">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                    <Icon className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm">{title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="border-t">
                <div className="mx-auto max-w-3xl px-6 py-20">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold tracking-tight mb-2">Perguntas frequentes</h2>
                        <p className="text-muted-foreground">Dúvidas comuns antes de criar uma conta.</p>
                    </div>
                    <div className="space-y-3">
                        {faqItems.map((item) => (
                            <FaqItem key={item.question} {...item} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA bottom */}
            <section className="border-t bg-muted/40">
                <div className="mx-auto max-w-5xl px-6 py-16 text-center">
                    <h2 className="text-2xl font-bold tracking-tight mb-3">
                        Pronto para organizar seu consultório?
                    </h2>
                    <p className="text-muted-foreground mb-8">Crie sua conta e comece a usar hoje mesmo.</p>
                    <Link to="/login?tab=register">
                        <Button size="lg" className="gap-2">
                            Criar conta gratuita
                            <ArrowRight className="size-4" />
                        </Button>
                    </Link>
                </div>
            </section>
        </>
    );
}
