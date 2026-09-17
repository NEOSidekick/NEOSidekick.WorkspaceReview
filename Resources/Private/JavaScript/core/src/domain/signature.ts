import type { ChangedPage } from '../types';

/**
 * Which changes a page carries and when they were last modified. The value is
 * stored with a reviewed mark: a page edited after the review produces a
 * different signature, so the mark is dropped and the page flagged as stale.
 */
export function pageSignature(page: Pick<ChangedPage, 'changes'>): string {
    return page.changes.map((change) => `${change.nodePath}@${change.lastModified}`).join('|');
}
