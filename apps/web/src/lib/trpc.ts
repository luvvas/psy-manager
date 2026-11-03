import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../api/src/routes/router";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Tipos de entrada e saída de cada procedure, inferidos do router da API.
 * Use no lugar de tipos escritos à mão ou `any`:
 *   type Transaction = RouterOutputs["financial"]["list"][number];
 * Com superjson, datas já chegam como `Date` — não precisa de `new Date(...)`.
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
