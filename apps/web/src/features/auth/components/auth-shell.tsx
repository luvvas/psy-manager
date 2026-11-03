import type { ReactNode } from "react";
import { Brain } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="mb-8 flex items-center gap-2">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Brain className="size-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">psy-manager</h1>
            </div>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                {children}
            </Card>
        </div>
    );
}

export function AuthErrorBanner({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <div role="alert" className="bg-destructive/15 text-destructive text-sm p-3 rounded-md font-medium">
            {message}
        </div>
    );
}
