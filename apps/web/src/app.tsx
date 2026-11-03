import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient, trpcClient } from "@/lib/query-client";
import { trpc } from "@/lib/trpc";
import { router } from "@/router";

export function App() {
    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <RouterProvider router={router} />
                    <Toaster position="bottom-right" />
                </TooltipProvider>
            </QueryClientProvider>
        </trpc.Provider>
    );
}
