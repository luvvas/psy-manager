import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export interface StatItem {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string; // The Tailwind classes, e.g., "text-emerald-600 bg-emerald-500/10"
}

export interface StatsCardsProps {
    items: StatItem[];
}

export function StatsCards({ items }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {items.map((stat) => (
                <Card key={stat.label} className="py-0 overflow-hidden">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                        >
                            <stat.icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold tracking-tight truncate">{stat.value}</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {stat.label}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
