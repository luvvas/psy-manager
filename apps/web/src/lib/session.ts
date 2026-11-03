import { signOut } from "./auth-client";
import { queryClient } from "./query-client";
import { applyTheme } from "./theme";

export async function signOutAndReset() {
    await signOut();
    queryClient.clear();
    applyTheme(null);
}
