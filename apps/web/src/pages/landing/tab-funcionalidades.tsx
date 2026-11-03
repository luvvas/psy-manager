import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import agendamentoImg from "@/assets/screenshots/agendamento.webp";
import consultaImg from "@/assets/screenshots/consulta.webp";
import documentosImg from "@/assets/screenshots/documentos.webp";
import financeiroImg from "@/assets/screenshots/financeiro.webp";
import pacientesImg from "@/assets/screenshots/pacientes.webp";
import {
    BarChart3,
    Calendar,
    FileText,
    FolderOpen,
    Users,
    Video,
} from "lucide-react";
import { type ElementType, useEffect, useState } from "react";

interface Screenshot {
    src: string;
    width: number;
    height: number;
}

interface FeatureSlide {
    icon: ElementType;
    title: string;
    subtitle: string;
    description: string;
    image?: Screenshot;
}

const featureSlides: FeatureSlide[] = [
    {
        icon: Calendar,
        title: "Agendamento",
        subtitle: "Calendário visual com múltiplas visões",
        description:
            "Visualize sua agenda no formato diário, semanal ou mensal. Crie, edite e cancele consultas diretamente no calendário, com sincronização ao Google Agenda.",
        image: { src: agendamentoImg, width: 1918, height: 909 },
    },
    {
        icon: Users,
        title: "Pacientes",
        subtitle: "Cadastro e histórico completos",
        description:
            "Gerencie todos os seus pacientes em um só lugar. Acesse informações de contato, histórico de atendimentos e linha do tempo clínica com rapidez.",
        image: { src: pacientesImg, width: 1901, height: 910 },
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
        image: { src: financeiroImg, width: 1902, height: 908 },
    },
    {
        icon: FolderOpen,
        title: "Documentos",
        subtitle: "Biblioteca de modelos e arquivos PDF",
        description:
            "Armazene contratos, modelos de anamnese e outros documentos PDF. Visualize, baixe e edite metadados diretamente na plataforma.",
        image: { src: documentosImg, width: 1916, height: 909 },
    },
    {
        icon: Video,
        title: "Consulta Online",
        subtitle: "Sessões de vídeo integradas",
        description:
            "Realize atendimentos online diretamente pela plataforma. Envie um link de convite ao paciente e conduza a sessão sem sair do psy-manager.",
        image: { src: consultaImg, width: 1918, height: 907 },
    },
];

export function TabFuncionalidades() {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [lightbox, setLightbox] = useState<FeatureSlide | null>(null);

    useEffect(() => {
        if (!api) return;
        const onSelect = () => setCurrent(api.selectedScrollSnap());
        api.on("select", onSelect).on("reInit", onSelect);
        return () => {
            api.off("select", onSelect).off("reInit", onSelect);
        };
    }, [api]);

    return (
        <>
        <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="text-center mb-12">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Veja o sistema em ação</h2>
                <p className="text-muted-foreground">
                    Navegue pelos módulos e conheça a interface do psy-manager.
                </p>
            </div>

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
                        {featureSlides.map((slide, index) => {
                            const Icon = slide.icon;
                            return (
                                <CarouselItem key={slide.title}>
                                    <div className="flex flex-col gap-6">
                                        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                                            <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/50">
                                                <span className="size-3 rounded-full bg-muted-foreground/20" />
                                                <span className="size-3 rounded-full bg-muted-foreground/20" />
                                                <span className="size-3 rounded-full bg-muted-foreground/20" />
                                                <div className="ml-3 flex-1 rounded bg-muted h-5 max-w-xs text-[14px] text-muted-foreground/50 flex items-center px-2">
                                                    app.psy-manager.com.br/{slide.title.toLowerCase()}
                                                </div>
                                            </div>

                                            {slide.image ? (
                                                <button
                                                    type="button"
                                                    aria-label={`Ampliar tela do módulo ${slide.title}`}
                                                    className="w-full cursor-zoom-in"
                                                    onClick={() => setLightbox(slide)}
                                                >
                                                    <img
                                                        src={slide.image.src}
                                                        width={slide.image.width}
                                                        height={slide.image.height}
                                                        alt={`Tela do módulo ${slide.title}`}
                                                        loading={index === 0 ? "eager" : "lazy"}
                                                        decoding="async"
                                                        className="h-auto w-full object-cover object-top"
                                                    />
                                                </button>
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

        <Dialog open={lightbox !== null} onOpenChange={(open) => { if (!open) setLightbox(null); }}>
            <DialogContent aria-describedby={undefined} className="w-auto max-w-[calc(100%-2rem)] bg-transparent p-0 ring-0 sm:max-w-[min(90vw,1600px)]">
                <DialogTitle className="sr-only">
                    {lightbox ? `Tela do módulo ${lightbox.title}` : "Tela ampliada"}
                </DialogTitle>
                {lightbox?.image && (
                    <img
                        src={lightbox.image.src}
                        width={lightbox.image.width}
                        height={lightbox.image.height}
                        alt={`Tela do módulo ${lightbox.title} ampliada`}
                        decoding="async"
                        className="h-auto max-h-[90vh] w-auto max-w-full rounded-lg shadow-2xl"
                    />
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}
