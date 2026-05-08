import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    CalendarDays,
    DollarSign,
    CreditCard,
    FileText,
    ClipboardList,
    FlaskConical,
    Search,
    Brain,
    LogOut,
    Settings,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession, signOut } from "@/lib/auth-client";

const NAV_ITEMS = [
    {
        title: "Agendamento",
        url: "/agendamento",
        icon: CalendarDays,
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
        title: "Financeiro",
        url: "/financeiro",
        icon: DollarSign,
        ready: false,
    },
    {
        title: "Pagamentos",
        url: "/pagamentos",
        icon: CreditCard,
        ready: false,
    },
    {
        title: "Contratos",
        url: "/contratos",
        icon: FileText,
        ready: false,
    },
    {
        title: "Prontuários",
        url: "/prontuarios",
        icon: ClipboardList,
        ready: false,
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
                        <SidebarMenuButton asChild tooltip="Configurações">
                            <Link to="/configuracoes">
                                <Settings />
                                <span>Configurações</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" tooltip="Sair" onClick={handleLogout}>
                            <Avatar className="size-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{session?.user?.name || "Psicólogo"}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {session?.user?.email || "Carregando..."}
                                </span>
                            </div>
                            <LogOut className="ml-auto size-4 text-muted-foreground" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
