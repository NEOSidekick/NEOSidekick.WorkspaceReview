import { deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { parseFeatureFlags } from './features';

describe('feature flag parsing', () => {
    it('reads the visual compare flag', () => {
        deepStrictEqual(parseFeatureFlags('{"visualCompare":false}'), { visualCompare: false });
        deepStrictEqual(parseFeatureFlags('{"visualCompare":true}'), { visualCompare: true });
    });

    it('keeps the default for a missing, broken or foreign value', () => {
        deepStrictEqual(parseFeatureFlags(null), { visualCompare: true });
        deepStrictEqual(parseFeatureFlags(''), { visualCompare: true });
        deepStrictEqual(parseFeatureFlags('{'), { visualCompare: true });
        deepStrictEqual(parseFeatureFlags('[]'), { visualCompare: true });
        deepStrictEqual(parseFeatureFlags('{"visualCompare":"yes"}'), { visualCompare: true });
    });
});
