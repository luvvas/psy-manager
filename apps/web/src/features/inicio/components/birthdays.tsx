import { Cake, Phone } from "lucide-react";
import { HomePanel, MoreItems } from "./home-panel";

export interface HomeBirthday {
    id: string;
    nome: string;
    telefone: string | null;
    daysUntil: number;
    dayMonth: string;
    turningAge: number;
}

interface BirthdaysProps {
    isLoading?: boolean;
    birthdays: HomeBirthday[];
    hiddenCount: number;
}

function whenLabel(daysUntil: number, dayMonth: string) {
    if (daysUntil === 0) return "Hoje";
    if (daysUntil === 1) return "Amanhã";
    return dayMonth;
}

export function Birthdays({ birthdays, hiddenCount, isLoading }: BirthdaysProps) {
    return (
        <HomePanel
            isLoading={isLoading}
            title="Aniversariantes"
            description="Pacientes que fazem aniversário nos próximos 30 dias."
            isEmpty={birthdays.length === 0}
            empty={{
                icon: Cake,
                title: "Nenhum aniversário por perto",
                description: "Pacientes com data de nascimento cadastrada aparecem aqui.",
            }}
        >
            <ul className="flex-1 divide-y">
                {birthdays.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                        <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                                b.daysUntil === 0 ? "bg-rose-500/10 text-rose-600" : "bg-muted text-muted-foreground"
                            }`}
                        >
                            <Cake className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{b.nome}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {b.telefone ? (
                                    <>
                                        <Phone className="size-3.5" /> {b.telefone}
                                    </>
                                ) : (
                                    "Sem telefone"
                                )}
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className={`text-xs font-semibold ${b.daysUntil === 0 ? "text-rose-600" : "text-foreground"}`}>
                                {whenLabel(b.daysUntil, b.dayMonth)}
                            </p>
                            <p className="text-xs text-muted-foreground">{b.turningAge} anos</p>
                        </div>
                    </li>
                ))}
            </ul>
            <MoreItems count={hiddenCount} to="/pacientes" />
        </HomePanel>
    );
}
