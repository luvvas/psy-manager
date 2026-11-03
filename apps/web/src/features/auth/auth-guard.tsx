import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/page-loader";
import { useSession } from "@/lib/auth-client";
import { useRedirectAfterLogin } from "./use-redirect-after-login";

export function AuthGuard() {
    const { data: session, isPending } = useSession();
    const location = useLocation();

    if (isPending) return <PageLoader />;
    if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
    return <Outlet />;
}

export function PublicOnlyGuard() {
    const { data: session, isPending } = useSession();
    const redirectTo = useRedirectAfterLogin();

    if (isPending) return <PageLoader />;
    if (session) return <Navigate to={redirectTo} replace />;
    return <Outlet />;
}
