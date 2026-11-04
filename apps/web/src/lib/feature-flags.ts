import { trpc, type RouterOutputs } from "@/lib/trpc";

export type FeatureFlagKey = keyof RouterOutputs["featureFlags"]["list"];

export function useFeatureFlag(key: FeatureFlagKey): boolean {
    const { data } = trpc.featureFlags.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
    return data?.[key] ?? false;
}
