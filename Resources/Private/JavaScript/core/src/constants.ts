import type { NodeChange } from './types';

/** Reviewed marks and the view mode are stored per browser, per workspace. */
export const STORAGE_PREFIX = 'neosidekick-workspace-review:';
export const LEGACY_STORAGE_PREFIX = 'codeq-workspace-review:';
/** CodeQ.WorkspaceReview keyed its marks by the DOM id of the page row. */
export const LEGACY_ENTRY_PREFIX = 'review-page-';
export const MODE_STORAGE_KEY = STORAGE_PREFIX + 'mode';

/** Set on every content element of a page rendered for the visual compare (Root.fusion). */
export const NODE_ATTRIBUTE = 'data-neosidekick-review-node';

/** The Fluid forms the React root is rendered next to, see the architecture §3.1. */
export const PUBLISH_FORM_ID = 'publishOrDiscardNodes';
export const POST_HELPER_FORM_ID = 'postHelper';
export const NODES_FIELD_NAME = 'moduleArguments[nodes][]';
export const ACTION_FIELD_NAME = 'moduleArguments[action]';

export const STATUSES = ['deleted', 'created', 'moved', 'hidden', 'edited'] as const;
export type ChangeStatus = (typeof STATUSES)[number];

/**
 * A card carries independent badges, the visual compare needs a single colour.
 * Removal is the strongest statement, an unchanged-but-reordered node the weakest.
 */
export function changeStatusOf(change: Pick<NodeChange, 'isRemoved' | 'isNew' | 'isMoved' | 'isHidden'>): ChangeStatus {
    if (change.isRemoved) return 'deleted';
    if (change.isNew) return 'created';
    if (change.isMoved) return 'moved';
    if (change.isHidden) return 'hidden';
    return 'edited';
}
