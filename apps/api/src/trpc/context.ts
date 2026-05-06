import { db } from "../db";

/**
 * tRPC context — available in every procedure.
 * Add session, auth, or other request-scoped data here.
 */
export type Context = {
  db: typeof db;
};

export function createContext(): Context {
  return {
    db,
  };
}
