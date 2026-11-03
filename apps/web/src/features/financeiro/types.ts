import type { RouterInputs, RouterOutputs } from "@/lib/trpc";

/** Transação como a API devolve (`financial.list`); datas já vêm como Date (superjson). */
export type Transaction = RouterOutputs["financial"]["list"][number];

/** O que o formulário envia para `financial.create` / `financial.update` (sem o id). */
export type TransactionInput = RouterInputs["financial"]["create"];

export type TransactionTypeFilter = "all" | "income" | "expense";
