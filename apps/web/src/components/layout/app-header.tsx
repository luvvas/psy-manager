import type { LucideIcon } from "lucide-react";

interface AppHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
}

export function AppHeader({ title, description, icon: Icon, actions }: AppHeaderProps) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-4" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-semibold leading-none">{title}</h1>
                        {description && (
                            <p className="mt-1.5 text-xs text-muted-foreground leading-none">{description}</p>
                        )}
                    </div>
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        </header>
    );
}
