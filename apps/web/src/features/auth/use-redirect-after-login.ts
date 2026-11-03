import { useLocation, type Location } from "react-router-dom";

/** Para onde voltar depois do login: a página que mandou para o /login, ou o Início. */
export function useRedirectAfterLogin() {
    const location = useLocation();
    const from = (location.state as { from?: Location } | null)?.from;
    return from ? `${from.pathname}${from.search}${from.hash}` : "/inicio";
}
