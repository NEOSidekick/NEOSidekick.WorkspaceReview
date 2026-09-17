import type { PublishingAction, ViewMode } from '../types';

export interface SingleAction {
    contextPath: string;
    action: PublishingAction;
}

export interface ReviewState {
    viewMode: ViewMode;
    activePageIndex: number;
    /** Keyed by ChangedPage.id. */
    collapsed: Record<string, boolean>;
    reviewed: Record<string, boolean>;
    stale: Record<string, boolean>;
    /** Context paths of the selected changes. */
    selection: ReadonlySet<string>;
    shortcutsOpen: boolean;
    highlightedChangeId: string | null;
    /** Set while a single card publishes or discards itself through the batch form. */
    singleAction: SingleAction | null;
}

export type ReviewAction =
    | { type: 'setViewMode'; mode: ViewMode }
    | { type: 'setActivePage'; index: number }
    | { type: 'setCollapsed'; pageId: string; collapsed: boolean }
    | { type: 'setReviewed'; pageId: string; reviewed: boolean }
    | { type: 'restoreReviewed'; reviewed: Record<string, boolean>; stale: Record<string, boolean> }
    | { type: 'setSelection'; selection: ReadonlySet<string> }
    | { type: 'setShortcutsOpen'; open: boolean }
    | { type: 'highlightChange'; changeId: string }
    | { type: 'clearHighlight' }
    | { type: 'setSingleAction'; singleAction: SingleAction | null };

export function createInitialState(viewMode: ViewMode): ReviewState {
    return {
        viewMode,
        activePageIndex: 0,
        collapsed: {},
        reviewed: {},
        stale: {},
        selection: new Set<string>(),
        shortcutsOpen: false,
        highlightedChangeId: null,
        singleAction: null,
    };
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
    switch (action.type) {
        case 'setViewMode':
            return state.viewMode === action.mode ? state : { ...state, viewMode: action.mode };
        case 'setActivePage':
            return state.activePageIndex === action.index ? state : { ...state, activePageIndex: action.index };
        case 'setCollapsed':
            return { ...state, collapsed: { ...state.collapsed, [action.pageId]: action.collapsed } };
        case 'setReviewed':
            // Marking a page reviewed collapses it and clears its stale flag; the
            // chevron can expand it again without clearing the mark.
            return {
                ...state,
                reviewed: { ...state.reviewed, [action.pageId]: action.reviewed },
                collapsed: { ...state.collapsed, [action.pageId]: action.reviewed },
                stale: { ...state.stale, [action.pageId]: false },
            };
        case 'restoreReviewed':
            return {
                ...state,
                reviewed: action.reviewed,
                stale: action.stale,
                collapsed: { ...state.collapsed, ...action.reviewed },
            };
        case 'setSelection':
            return { ...state, selection: action.selection };
        case 'setShortcutsOpen':
            return { ...state, shortcutsOpen: action.open };
        case 'highlightChange':
            return { ...state, viewMode: 'list', highlightedChangeId: action.changeId };
        case 'clearHighlight':
            return state.highlightedChangeId === null ? state : { ...state, highlightedChangeId: null };
        case 'setSingleAction':
            return { ...state, singleAction: action.singleAction };
        default:
            return state;
    }
}
