import type { MarkStore } from '../domain/reviewedMarks';
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
    /**
     * The reviewed marks, keyed by ChangedPage.id with the page signature as
     * the value. Holding a mark is what "reviewed" means, so this is the only
     * representation of it; the browser storage mirrors it.
     */
    marks: MarkStore;
    /** False until the stored marks have been matched against this load. */
    marksRestored: boolean;
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
    /** A signature marks the page as reviewed, null takes the mark away. */
    | { type: 'setReviewed'; pageId: string; signature: string | null }
    | { type: 'restoreMarks'; marks: MarkStore; stale: Record<string, boolean> }
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
        marks: {},
        marksRestored: false,
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
        case 'setReviewed': {
            // Marking a page reviewed collapses it and clears its stale flag; the
            // chevron can expand it again without clearing the mark.
            const marks = { ...state.marks };
            if (action.signature === null) delete marks[action.pageId];
            else marks[action.pageId] = action.signature;
            return {
                ...state,
                marks,
                collapsed: { ...state.collapsed, [action.pageId]: action.signature !== null },
                stale: { ...state.stale, [action.pageId]: false },
            };
        }
        case 'restoreMarks': {
            const collapsed = { ...state.collapsed };
            Object.keys(action.marks).forEach((pageId) => {
                collapsed[pageId] = true;
            });
            return { ...state, marks: action.marks, marksRestored: true, stale: action.stale, collapsed };
        }
        case 'setSelection':
            return { ...state, selection: action.selection };
        case 'setShortcutsOpen':
            return { ...state, shortcutsOpen: action.open };
        case 'highlightChange':
            return { ...state, viewMode: 'list', highlightedChangeId: action.changeId };
        case 'clearHighlight':
            return state.highlightedChangeId === null ? state : { ...state, highlightedChangeId: null };
        case 'setSingleAction':
            // A second card action while the first one is posting would replace
            // the hidden field and abort the running navigation.
            return state.singleAction !== null && action.singleAction !== null
                ? state
                : { ...state, singleAction: action.singleAction };
        default:
            return state;
    }
}
