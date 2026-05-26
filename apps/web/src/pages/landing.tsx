import { changelog, changeTypeConfig } from "@/data/changelog";
import { Button } from "@/components/ui/button";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
    ArrowRight,
    BarChart3,
    Brain,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
    FolderOpen,
    Globe,
    KeyRound,
    Loader2,
    Lock,
    Puzzle,
    Server,
    ShieldCheck,
    Sparkles,
    Target,
    Users,
    Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

type Tab = "inicio" | "funcionalidades" | "atualizacoes" | "sobre";

// ─── dados ───────────────────────────────────────────────────────────────────

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
        icon: Lock,
        title: "Autenticação segura",
        description:
            "Login com e-mail e senha gerenciado pelo Better Auth, com suporte a redefinição de senha via link temporário enviado por e-mail.",
    },
    {
        icon: ShieldCheck,
        title: "Isolamento de dados",
        description:
            "Cada psicólogo acessa apenas seus próprios dados. Pacientes, prontuários, transações e documentos são sempre filtrados pelo ID do usuário autenticado.",
    },
    {
        icon: Server,
        title: "Armazenamento de arquivos",
        description:
            "PDFs são armazenados na AWS S3 com URLs pré-assinadas de curta duração. Nenhum arquivo fica exposto publicamente — o acesso é sempre temporário e autenticado.",
    },
    {
        icon: KeyRound,
        title: "Tráfego cifrado",
        description:
            "Toda comunicação entre o navegador e a API trafega sobre HTTPS/TLS. O frontend é entregue via CloudFront com certificado SSL gerenciado.",
    },
];

const faqItems = [
    {
        question: "O psy-manager é gratuito?",
        answer:
            "Sim. Basta criar uma conta para começar a usar. Não há cobrança para cadastro ou uso dos módulos atuais.",
    },
    {
        question: "Preciso instalar algum programa?",
        answer:
            "Não. O psy-manager roda inteiramente no navegador — Chrome, Firefox, Edge ou Safari atualizado. Não há download necessário.",
    },
    {
        question: "Meus dados ficam visíveis para outros psicólogos?",
        answer:
            "Não. Cada psicólogo enxerga somente seus próprios pacientes, prontuários, transações e documentos. A única exceção são os agendamentos de clínicas compartilhadas, e apenas quando você mesmo adiciona o vínculo.",
    },
    {
        question: "Posso usar junto com minha clínica?",
        answer:
            "Sim. O módulo de Clínicas permite vincular profissionais a uma clínica por e-mail. Após o vínculo, você pode visualizar os agendamentos dos demais membros naquele espaço.",
    },
    {
        question: "Como faço para importar meus dados financeiros existentes?",
        answer:
            "O módulo Financeiro aceita importação de lançamentos via arquivo CSV. Basta exportar do seu sistema atual no formato suportado e importar na tela de transações.",
    },
    {
        question: "Existe integração com o Google Agenda?",
        answer:
            "Sim. No módulo de Agendamento você pode conectar sua conta Google e importar eventos existentes. Os agendamentos criados no psy-manager também podem ser sincronizados.",
    },
];

// Slides do carrossel: adicione screenshots reais substituindo o campo `image`.
// Enquanto não há imagens, o slot exibe um placeholder descritivo.
const featureSlides: {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    description: string;
    image?: string;
}[] = [
        {
            icon: Calendar,
            title: "Agendamento",
            subtitle: "Calendário visual com múltiplas visões",
            description:
                "Visualize sua agenda no formato diário, semanal ou mensal. Crie, edite e cancele consultas diretamente no calendário, com sincronização ao Google Agenda.",
            image: "/screenshots/agendamento.png",
        },
        {
            icon: Users,
            title: "Pacientes",
            subtitle: "Cadastro e histórico completos",
            description:
                "Gerencie todos os seus pacientes em um só lugar. Acesse informações de contato, histórico de atendimentos e linha do tempo clínica com rapidez.",
            image: "/screenshots/pacientes.png",
        },
        {
            icon: FileText,
            title: "Prontuário",
            subtitle: "Registros clínicos organizados por sessão",
            description:
                "Escreva prontuários com status de rascunho ou finalizado. Anexe PDFs, organize por data e mantenha o histórico clínico seguro e acessível.",
            // image: "/screenshots/prontuario.png",
        },
        {
            icon: BarChart3,
            title: "Financeiro",
            subtitle: "Fluxo de caixa e receitas em tempo real",
            description:
                "Acompanhe receitas e despesas, visualize gráficos de fluxo de caixa e importe lançamentos via CSV para manter suas finanças organizadas.",
            image: "/screenshots/financeiro.png",
        },
        {
            icon: FolderOpen,
            title: "Documentos",
            subtitle: "Biblioteca de modelos e arquivos PDF",
            description:
                "Armazene contratos, modelos de anamnese e outros documentos PDF. Visualize, baixe e edite metadados diretamente na plataforma.",
            image: "/screenshots/documentos.png",
        },
        {
            icon: Video,
            title: "Consulta Online",
            subtitle: "Sessões de vídeo integradas",
            description:
                "Realize atendimentos online diretamente pela plataforma. Envie um link de convite ao paciente e conduza a sessão sem sair do psy-manager.",
            image: "/screenshots/consulta.png",
        },
    ];


// ─── guard ────────────────────────────────────────────────────────────────────

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

// ─── sub-componentes ──────────────────────────────────────────────────────────

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

// ─── abas ─────────────────────────────────────────────────────────────────────

function TabInicio() {
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

function TabFuncionalidades() {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => setCurrent(api.selectedScrollSnap()));
    }, [api]);

    return (
        <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="text-center mb-12">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Veja o sistema em ação</h2>
                <p className="text-muted-foreground">
                    Navegue pelos módulos e conheça a interface do psy-manager.
                </p>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mb-8">
                {featureSlides.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Ir para slide ${i + 1}`}
                        onClick={() => api?.scrollTo(i)}
                        className={cn(
                            "rounded-full transition-all",
                            i === current
                                ? "w-6 h-2 bg-primary"
                                : "size-2 bg-muted-foreground/25 hover:bg-muted-foreground/50",
                        )}
                    />
                ))}
            </div>
            <div className="relative">
                <Carousel
                    setApi={setApi}
                    opts={{ loop: false, align: "start" }}
                    className="w-full"
                >
                    <CarouselContent>
                        {featureSlides.map((slide) => {
                            const Icon = slide.icon;
                            return (
                                <CarouselItem key={slide.title}>
                                    <div className="flex flex-col gap-6">
                                        {/* Screenshot frame */}
                                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                                            {/* Browser chrome */}
                                            <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/50">
                                                <span className="size-3 rounded-full bg-muted-foreground/20" />
                                                <span className="size-3 rounded-full bg-muted-foreground/20" />
                                                <span className="size-3 rounded-full bg-muted-foreground/20" />
                                                <div className="ml-3 flex-1 rounded bg-muted h-5 max-w-xs text-[14px] text-muted-foreground/50 flex items-center px-2">
                                                    app.psy-manager.com.br/{slide.title.toLowerCase()}
                                                </div>
                                            </div>

                                            {/* Screenshot area */}
                                            {slide.image ? (
                                                <img
                                                    src={slide.image}
                                                    alt={`Screenshot do módulo ${slide.title}`}
                                                    className="w-full object-cover object-top"
                                                    style={{ aspectRatio: "auto" }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full flex flex-col items-center justify-center gap-4 bg-muted/20"
                                                    style={{ aspectRatio: "16/9" }}
                                                >
                                                    <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                        <Icon className="size-8" />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Screenshot em breve
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Slide info */}
                                        <div className="text-center space-y-2 pb-2">
                                            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
                                                <Icon className="size-3.5" />
                                                {slide.title}
                                            </div>
                                            <h3 className="text-lg font-semibold tracking-tight">
                                                {slide.subtitle}
                                            </h3>
                                            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                                {slide.description}
                                            </p>
                                        </div>
                                    </div>
                                </CarouselItem>
                            );
                        })}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </div>
        </div>
    );
}

function TabAtualizacoes() {
    return (
        <div className="mx-auto max-w-3xl px-6 py-20">
            <div className="text-center mb-14">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Atualizações</h2>
                <p className="text-muted-foreground">
                    Registro de melhorias, novas funcionalidades e correções ao longo do tempo.
                </p>
            </div>

            <div className="relative">
                {/* Linha vertical */}
                <div className="absolute left-2.75 top-2 bottom-2 w-px bg-border" />

                <div className="space-y-10">
                    {changelog.map((entry) => (
                        <div key={entry.version} className="relative flex gap-5">
                            {/* Dot */}
                            <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background mt-0.5">
                                <span className="size-2 rounded-full bg-primary" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-2">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="font-semibold text-sm">v{entry.version}</span>
                                    <span className="text-xs text-muted-foreground">{entry.date}</span>
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
        </div>
    );
}

function TabSobre() {
    return (
        <div className="mx-auto max-w-3xl px-6 py-20 space-y-16">
            <section className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Sobre o psy-manager</h2>
                <p className="text-muted-foreground leading-relaxed">
                    O <strong className="text-foreground">psy-manager</strong> nasceu da necessidade de
                    psicólogos brasileiros terem uma ferramenta prática e centralizada para a gestão do
                    consultório — sem depender de planilhas, agendas físicas ou sistemas genéricos que
                    não foram feitos para a realidade clínica.
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

            <section className="space-y-4">
                <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    <Puzzle className="size-5 text-primary" />
                    O que está disponível hoje
                </h3>
                <ul className="space-y-3">
                    {[
                        ["Agendamento", "Calendário completo com integração ao Google Agenda."],
                        ["Pacientes", "Cadastro, histórico clínico e linha do tempo de atendimentos."],
                        ["Prontuário", "Registros clínicos com anexo de PDFs e controle de status."],
                        ["Financeiro", "Fluxo de caixa, gráficos, importação CSV."],
                        ["Documentos", "Biblioteca de modelos e documentos em PDF."],
                        ["Clínicas", "Vínculos entre psicólogos e espaços compartilhados."],
                        ["Consulta online", "Sessões de vídeo integradas diretamente na plataforma."],
                    ].map(([name, desc]) => (
                        <li key={name} className="flex gap-3 text-sm">
                            <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
                            <span>
                                <strong className="text-foreground">{name}:</strong>{" "}
                                <span className="text-muted-foreground">{desc}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-4">
                <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    <Globe className="size-5 text-primary" />
                    Tecnologia
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    O psy-manager é construído como um monorepo TypeScript moderno. O frontend usa{" "}
                    <strong className="text-foreground">React 19</strong> com Vite e Tailwind CSS. O
                    backend expõe uma API tipada via{" "}
                    <strong className="text-foreground">tRPC</strong> sobre Hono, com PostgreSQL e
                    Drizzle ORM. A autenticação é gerenciada pelo{" "}
                    <strong className="text-foreground">Better Auth</strong> e os arquivos são
                    armazenados na <strong className="text-foreground">AWS S3</strong> com entrega via
                    CloudFront. O padrão CQRS com event sourcing é aplicado nos domínios de maior
                    complexidade (pacientes e agendamentos).
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    A infraestrutura de produção roda em EC2 para a API, RDS PostgreSQL gerenciado e
                    S3 + CloudFront para o frontend — com segredos gerenciados via AWS SSM Parameter
                    Store.
                </p>
            </section>

            <section className="border-t pt-10 text-center space-y-4">
                <p className="text-muted-foreground">Quer experimentar?</p>
                <Link to="/login?tab=register">
                    <Button size="lg" className="gap-2">
                        Criar conta gratuita
                        <ArrowRight className="size-4" />
                    </Button>
                </Link>
            </section>
        </div>
    );
}

// ─── página ───────────────────────────────────────────────────────────────────

const tabLabels: Record<Tab, string> = {
    inicio: "Início",
    funcionalidades: "Funcionalidades",
    atualizacoes: "Atualizações",
    sobre: "Sobre",
};

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
            {tab === "atualizacoes" && <TabAtualizacoes />}
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
