import { Link } from "react-router-dom";
import { CalendarDays, DollarSign, FileText, Users, type LucideIcon } from "lucide-react";
import { HomePanel } from "./home-panel";

interface QuickLink {
    title: string;
    description: string;
    url: string;
    icon: LucideIcon;
    color: string;
}

const LINKS: QuickLink[] = [
    {
        title: "Agendamento",
        description: "Agenda da semana e novas sessões",
        url: "/agendamento",
        icon: CalendarDays,
        color: "text-emerald-600 bg-emerald-500/10",
    },
    {
        title: "Pacientes",
        description: "Cadastros e prontuários",
        url: "/pacientes",
        icon: Users,
        color: "text-violet-600 bg-violet-500/10",
    },
    {
        title: "Financeiro",
        description: "Receitas, despesas e balanço",
        url: "/financeiro",
        icon: DollarSign,
        color: "text-amber-600 bg-amber-500/10",
    },
    {
        title: "Documentos",
        description: "Contratos, laudos e modelos",
        url: "/documentos",
        icon: FileText,
        color: "text-sky-600 bg-sky-500/10",
    },
];

export function QuickLinks() {
    return (
        <HomePanel title="Acesso rápido" description="Vá direto para um módulo.">
            <ul className="divide-y">
                {LINKS.map((link) => (
                    <li key={link.url}>
                        <Link
                            to={link.url}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                        >
                            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
                                <link.icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{link.title}</p>
                                <p className="truncate text-xs text-muted-foreground">{link.description}</p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </HomePanel>
    );
}
