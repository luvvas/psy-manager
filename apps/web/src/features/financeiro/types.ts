import type { RouterInputs, RouterOutputs } from "@/lib/trpc";

export type Transaction = RouterOutputs["financial"]["list"][number];

export type TransactionInput = RouterInputs["financial"]["create"];

export type TransactionTypeFilter = "all" | "income" | "expense";
