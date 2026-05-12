import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    CalendarDays,
    DollarSign,
    FileText,
    FlaskConical,
    Search,
    Brain,
    LogOut,
    Users,
    Building2,
} from "lucide-react";
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
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";
import { AppSheet } from "@/components/layout/app-sheet";
import { ProfileForm } from "./profile-form";

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
    },
    {
        title: "Exames",
        url: "/exames",
        icon: FlaskConical,
        ready: false,
    },
    {
        title: "Buscar Psicólogos",
        url: "/buscar",
        icon: Search,
        ready: false,
    },
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

                <SidebarRail />
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
