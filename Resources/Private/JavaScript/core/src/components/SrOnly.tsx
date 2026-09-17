import * as React from 'react';

import { SR_ONLY_CLASS } from '../constants';

/**
 * Text that only a screen reader reads, for icon-only controls. It uses the
 * same global class the server writes into its diffs, so the rule exists once.
 */
export function SrOnly({ children }: { children: React.ReactNode }) {
    return <span className={SR_ONLY_CLASS}>{children}</span>;
}
