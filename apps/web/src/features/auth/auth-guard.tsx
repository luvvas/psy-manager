import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export function AuthGuard() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isPending && !session) {
            navigate("/login", { state: { from: location }, replace: true });
        }
    }, [isPending, session, navigate, location]);

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return <Outlet />;
}

export function PublicOnlyGuard() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isPending && session) {
            navigate("/agendamento", { replace: true });
        }
    }, [isPending, session, navigate]);

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (session) {
        return null;
    }

    return <Outlet />;
}
