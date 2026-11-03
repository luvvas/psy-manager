import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, FileSignature } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HomePanel, MoreItems } from "./home-panel";

export interface HomeUnsignedRecord {
    id: string;
    title: string;
    category: string;
    patientId: string;
    patientNome: string;
    dateOfService: Date;
}

interface UnsignedRecordsProps {
    isLoading?: boolean;
    records: HomeUnsignedRecord[];
    hiddenCount: number;
}

export function UnsignedRecords({ records, hiddenCount, isLoading }: UnsignedRecordsProps) {
    return (
        <HomePanel
            isLoading={isLoading}
            title="Prontuários sem assinatura"
            description="Registros em rascunho, dos mais antigos aos mais recentes."
            isEmpty={records.length === 0}
            empty={{
                icon: FileSignature,
                title: "Tudo assinado",
                description: "Registros clínicos em rascunho aparecem aqui até serem assinados.",
            }}
        >
            <ul className="flex-1 divide-y">
                {records.map((r) => (
                    <li key={r.id}>
                        <Link
                            to={`/pacientes/${r.patientId}`}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                            title="Abrir prontuário"
                        >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                                <ClipboardList className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {r.patientNome} · {format(r.dateOfService, "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                            </div>
                            <Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
                                Rascunho
                            </Badge>
                        </Link>
                    </li>
                ))}
            </ul>
            <MoreItems count={hiddenCount} to="/pacientes" />
        </HomePanel>
    );
}
