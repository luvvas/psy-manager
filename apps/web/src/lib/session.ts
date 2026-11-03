import { signOut } from "./auth-client";
import { queryClient } from "./query-client";
import { applyTheme } from "./theme";

/**
 * Sai da conta e apaga tudo que é da usuária na aba: o cache das queries
 * (senão quem entrar em seguida vê por instantes as listas da anterior) e as
 * cores do tema dela.
 */
export async function signOutAndReset() {
    await signOut();
    queryClient.clear();
    applyTheme(null);
}
