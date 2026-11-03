import type { LucideIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
}

export function AppHeader({ title, description, icon: Icon, actions }: AppHeaderProps) {
    return (
        <header
            className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-colors duration-300"
            style={{
                backgroundColor: "var(--app-header-bg, var(--background))",
            }}
        >
            <SidebarTrigger className="-ml-1 md:hidden" style={{ color: "var(--app-header-fg, inherit)" }} />
            <div className="flex flex-1 items-center justify-between">
                <div
                    className="flex items-center gap-3"
                    style={{ color: "var(--app-header-fg, inherit)" }}
                >
                    {Icon && (
                        <div
                            className="flex size-8 items-center justify-center rounded-lg"
                            style={{
                                backgroundColor: "var(--app-header-icon-bg, color-mix(in srgb, var(--primary) 10%, transparent))",
                                color: "var(--app-header-fg, var(--primary))",
                            }}
                        >
                            <Icon className="size-4" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-semibold leading-none">{title}</h1>
                        {description && (
                            <p
                                className="mt-1.5 text-xs leading-none"
                                style={{ color: "var(--app-header-muted, var(--muted-foreground))" }}
                            >
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
        </header>
    );
}
