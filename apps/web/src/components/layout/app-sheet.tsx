import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface AppSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function AppSheet({
    open,
    onOpenChange,
    title,
    description,
    children,
}: AppSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-[450px] md:max-w-[700px] lg:max-w-[800px] xl:max-w-[900px] p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="px-6 py-4">
                        <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
                        {description && (
                            <SheetDescription className="text-xs text-muted-foreground mt-1">
                                {description}
                            </SheetDescription>
                        )}
                    </SheetHeader>
                    <Separator />
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {children}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
