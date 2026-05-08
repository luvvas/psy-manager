import { AppHeader } from "@/components/layout/app-header";
import { Construction, type LucideIcon } from "lucide-react";

interface ComingSoonPageProps {
    title: string;
    description: string;
    icon?: LucideIcon;
}

export function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
    return (
        <>
            <AppHeader title={title} icon={icon} />
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                        <Construction className="size-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
