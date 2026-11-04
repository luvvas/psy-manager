import { createHash } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { featureFlag, featureFlagOverride } from "../db/schema";

export const FEATURE_FLAGS = ["pagamentos"] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAGS)[number];

export function rolloutBucket(key: string, psychologistId: string): number {
    return createHash("sha256").update(`${key}:${psychologistId}`).digest().readUInt32BE(0) % 100;
}

type FlagRow = { key: string; enabled: boolean; rolloutPercent: number };

function decide(flag: FlagRow | undefined, override: boolean | undefined, psychologistId: string): boolean {
    if (override !== undefined) return override;
    if (!flag) return false;
    if (flag.enabled) return true;
    return rolloutBucket(flag.key, psychologistId) < flag.rolloutPercent;
}

export const featureFlagService = {
    async listForUser(psychologistId: string): Promise<Record<FeatureFlagKey, boolean>> {
        const keys = [...FEATURE_FLAGS];
        const [flags, overrides] = await Promise.all([
            db
                .select({ key: featureFlag.key, enabled: featureFlag.enabled, rolloutPercent: featureFlag.rolloutPercent })
                .from(featureFlag)
                .where(inArray(featureFlag.key, keys)),
            db
                .select({ flagKey: featureFlagOverride.flagKey, enabled: featureFlagOverride.enabled })
                .from(featureFlagOverride)
                .where(and(eq(featureFlagOverride.psychologistId, psychologistId), inArray(featureFlagOverride.flagKey, keys))),
        ]);
        const flagByKey = new Map(flags.map((f) => [f.key, f]));
        const overrideByKey = new Map(overrides.map((o) => [o.flagKey, o.enabled]));
        return Object.fromEntries(
            keys.map((key) => [key, decide(flagByKey.get(key), overrideByKey.get(key), psychologistId)])
        ) as Record<FeatureFlagKey, boolean>;
    },

    async isEnabled(key: FeatureFlagKey, psychologistId: string): Promise<boolean> {
        const [[flag], [override]] = await Promise.all([
            db
                .select({ key: featureFlag.key, enabled: featureFlag.enabled, rolloutPercent: featureFlag.rolloutPercent })
                .from(featureFlag)
                .where(eq(featureFlag.key, key))
                .limit(1),
            db
                .select({ enabled: featureFlagOverride.enabled })
                .from(featureFlagOverride)
                .where(and(eq(featureFlagOverride.flagKey, key), eq(featureFlagOverride.psychologistId, psychologistId)))
                .limit(1),
        ]);
        return decide(flag, override?.enabled, psychologistId);
    },
};
