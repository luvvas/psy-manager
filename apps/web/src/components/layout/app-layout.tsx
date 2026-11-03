import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { trpc } from "@/lib/trpc";
import { applyTheme, type ThemeConfig } from "@/lib/theme";

export function AppLayout() {
    const { data: profile } = trpc.psychologist.me.useQuery();
    const loaded = profile !== undefined;
    const themeConfig = profile?.themeConfig as ThemeConfig | null | undefined;

    useEffect(() => {
        if (!loaded) return;
        applyTheme(themeConfig);
    }, [loaded, themeConfig]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="h-svh overflow-x-hidden overflow-y-auto">
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    );
}
