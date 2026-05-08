import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
    return (
        <SonnerToaster
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-sans rounded-xl border p-4",
                    description: "group-[.toast]:text-muted-foreground text-xs",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    success: "group-[.toast]:text-emerald-500",
                    error: "group-[.toast]:text-destructive",
                },
            }}
            {...props}
        />
    );
}
