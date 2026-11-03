import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "../types";
import { APPOINTMENT_STATUS_LABELS } from "../types";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
    confirmado:
        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400",
    pendente:
        "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 dark:text-amber-400",
    cancelado:
        "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20 dark:text-rose-400",
    concluido:
        "bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500/20 dark:text-sky-400",
};

interface StatusBadgeProps {
    status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <Badge variant="outline" className={STATUS_STYLES[status]}>
            {APPOINTMENT_STATUS_LABELS[status]}
        </Badge>
    );
}
