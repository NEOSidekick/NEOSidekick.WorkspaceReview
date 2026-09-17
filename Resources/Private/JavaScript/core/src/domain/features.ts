import type { FeatureFlags } from '../types';

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = { visualCompare: true };

/**
 * Reads the JSON of the `data-features` attribute. Anything unreadable keeps the
 * defaults, so a missing or broken configuration never blanks the module.
 */
export function parseFeatureFlags(raw: string | null | undefined): FeatureFlags {
    if (!raw) return { ...DEFAULT_FEATURE_FLAGS };
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        return { ...DEFAULT_FEATURE_FLAGS };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_FEATURE_FLAGS };
    const candidate = (parsed as Record<string, unknown>).visualCompare;
    return {
        visualCompare: typeof candidate === 'boolean' ? candidate : DEFAULT_FEATURE_FLAGS.visualCompare,
    };
}
