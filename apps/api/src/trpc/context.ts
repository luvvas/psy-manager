import { db } from "../db";
import { auth } from "../lib/auth";

export type Context = {
    db: typeof db;
    session: typeof auth.$Infer.Session | null;
};

export async function createContext(opts: { headers: Headers }): Promise<Context> {
    const session = await auth.api.getSession({
        headers: opts.headers,
    });

    return {
        db,
        session,
    };
}
