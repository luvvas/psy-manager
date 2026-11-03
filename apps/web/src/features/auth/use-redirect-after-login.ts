import { useLocation, type Location } from "react-router-dom";

export function useRedirectAfterLogin() {
    const location = useLocation();
    const from = (location.state as { from?: Location } | null)?.from;
    return from ? `${from.pathname}${from.search}${from.hash}` : "/inicio";
}
