import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { trpc } from "@/lib/trpc";
import { applyTheme, type ThemeConfig } from "@/lib/theme";

export function AppLayout() {
    const { data: profile } = trpc.psychologist.me.useQuery();

    useEffect(() => {
        applyTheme(profile?.themeConfig as ThemeConfig | null);
    }, [profile?.themeConfig]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="h-svh overflow-x-hidden overflow-y-auto">
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    );
}
