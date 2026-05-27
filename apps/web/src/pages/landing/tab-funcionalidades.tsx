import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Calendar,
    FileText,
    FolderOpen,
    Users,
    Video,
} from "lucide-react";
import { type ElementType, useEffect, useState } from "react";

const featureSlides: {
    icon: ElementType;
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

export function TabFuncionalidades() {
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
