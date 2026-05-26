import { AppSheet } from "@/components/layout/app-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";
import {
    Brain,
    Building2,
    CalendarDays,
    DollarSign,
    FileText,
    LogOut,
    MessageSquareDot,
    Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FeedbackDialog } from "./feedback-dialog";
import { ProfileForm } from "./profile-form";

function ResizableSidebarRail() {
    const { state, toggleSidebar, setWidth } = useSidebar();
    const railRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;

        let startX = 0;
        let startWidth = 0;
        let dragged = false;

        const getSidebarGapWidth = (): number => {
            const gap = rail
                .closest<HTMLElement>('[data-slot="sidebar"]')
                ?.querySelector<HTMLElement>('[data-slot="sidebar-gap"]');
            return gap?.getBoundingClientRect().width ?? 256;
        };

        const onPointerDown = (e: PointerEvent) => {
            if (state === "collapsed") { toggleSidebar(); return; }
            e.preventDefault();
            startX = e.clientX;
            startWidth = getSidebarGapWidth();
            dragged = false;
            rail.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!rail.hasPointerCapture(e.pointerId)) return;
            const delta = e.clientX - startX;
            if (Math.abs(delta) > 3) dragged = true;
            if (!dragged) return;
            setWidth(startWidth + delta);
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!rail.hasPointerCapture(e.pointerId)) return;
            rail.releasePointerCapture(e.pointerId);
            if (!dragged) toggleSidebar();
        };

        rail.addEventListener("pointerdown", onPointerDown);
        rail.addEventListener("pointermove", onPointerMove);
        rail.addEventListener("pointerup", onPointerUp);

        return () => {
            rail.removeEventListener("pointerdown", onPointerDown);
            rail.removeEventListener("pointermove", onPointerMove);
            rail.removeEventListener("pointerup", onPointerUp);
        };
    }, [state, toggleSidebar, setWidth]);

    return (
        <button
            ref={railRef}
            data-sidebar="rail"
            aria-label="Redimensionar sidebar"
            tabIndex={-1}
            className={[
                "absolute inset-y-0 z-20 hidden w-4 sm:flex",
                "group-data-[side=left]:-right-4 ltr:-translate-x-1/2",
                "after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 hover:after:bg-sidebar-border",
                state === "collapsed" ? "cursor-e-resize" : "cursor-col-resize",
            ].join(" ")}
        />
    );
}

const NAV_ITEMS = [
    {
        title: "Agendamento",
        url: "/agendamento",
        icon: CalendarDays,
        ready: true,
    },
    {
        title: "Financeiro",
        url: "/financeiro",
        icon: DollarSign,
        ready: true,
    },
    {
        title: "Documentos",
        url: "/documentos",
        icon: FileText,
        ready: true,
    },
    {
        title: "Pacientes",
        url: "/pacientes",
        icon: Users,
        ready: true,
    },
    {
        title: "Clínicas",
        url: "/clinicas",
        icon: Building2,
        ready: true,
    }
];

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { data: session } = useSession();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate("/login");
    };

    const userInitials = session?.user?.name
        ?.split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "PS";

    return (
        <>
            <Sidebar collapsible="icon" variant="sidebar">
                <SidebarHeader>
                    <div className="flex items-center justify-between px-1 group-data-[collapsible=icon]:justify-center">
                        <SidebarMenu className="group-data-[collapsible=icon]:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton size="lg" asChild tooltip="psy-manager">
                                    <Link to="/">
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                            <Brain className="size-4" />
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">psy-manager</span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                Gestão clínica
                                            </span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                        <SidebarTrigger className="group-data-[collapsible=icon]:size-8" />
                    </div>
                </SidebarHeader>

                <SidebarSeparator />

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Módulos</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {NAV_ITEMS.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={location.pathname.startsWith(item.url)}
                                            tooltip={item.title}
                                        >
                                            <Link to={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                                {!item.ready && (
                                                    <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                                                        Em breve
                                                    </span>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarSeparator />

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <FeedbackDialog>
                                <SidebarMenuButton className="mb-2" tooltip="Enviar feedback">
                                    <MessageSquareDot />
                                    <span>Enviar feedback</span>
                                </SidebarMenuButton>
                            </FeedbackDialog>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <div className="flex items-center w-full group-data-[collapsible=icon]:flex-col gap-1 p-0">
                                <SidebarMenuButton
                                    size="lg"
                                    tooltip="Meu Perfil"
                                    onClick={() => setIsProfileOpen(true)}
                                    className="flex-1"
                                >
                                    <Avatar className="size-8 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                            {userInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                                        <span className="truncate font-semibold">{session?.user?.name || "Psicólogo"}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {session?.user?.email || "Carregando..."}
                                        </span>
                                    </div>
                                </SidebarMenuButton>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title="Sair"
                                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                >
                                    <LogOut className="size-4" />
                                </button>
                            </div>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>

                <ResizableSidebarRail />
            </Sidebar>

            <AppSheet
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                title="Meu Perfil"
            >
                <ProfileForm onSuccess={() => setIsProfileOpen(false)} />
            </AppSheet>
        </>
    );
}
