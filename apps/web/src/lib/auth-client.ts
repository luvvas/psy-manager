import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../api/src/lib/auth";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || window.location.origin,
    plugins: [inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;
