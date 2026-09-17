import * as React from 'react';
import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';

import { MODE_STORAGE_KEY } from '../constants';
import { clampPageIndex, collectTreeRows } from '../domain/pages';
import { focusWithoutScroll, pageElement, scrollIntoView, sidebarLinkElement } from '../dom';
import type { TreeRow } from '../domain/pages';
import { readViewMode, safeLocalStorage } from '../domain/viewMode';
import type { StorageLike } from '../domain/viewMode';
import { createInitialState, reviewReducer } from './reducer';
import type { ReviewState, SingleAction } from './reducer';
import type { ChangedPage, FeatureFlags, ModuleUris, PublishingAction, ViewMode, Workspace } from '../types';

export interface ReviewData {
    workspace: Workspace;
    pages: ChangedPage[];
    treeRows: TreeRow[];
    features: FeatureFlags;
    uris: ModuleUris;
}

export interface ReviewActions {
    setViewMode(mode: ViewMode): void;
    setActivePage(index: number): void;
    setCollapsed(pageId: string, collapsed: boolean): void;
    setSelection(selection: ReadonlySet<string>): void;
    setShortcutsOpen(open: boolean): void;
    showChangeInList(changeId: string): void;
    clearHighlight(): void;
    runSingleAction(contextPath: string, action: PublishingAction): void;
    clearSingleAction(): void;
}

const StateContext = createContext<ReviewState | null>(null);
const ActionsContext = createContext<ReviewActions | null>(null);
const DataContext = createContext<ReviewData | null>(null);

interface ProviderProps extends Omit<ReviewData, 'pages' | 'treeRows'> {
    children: React.ReactNode;
}

export function ReviewStateProvider({ workspace, features, uris, children }: ProviderProps) {
    const storageRef = useRef<StorageLike | null>(null);
    if (storageRef.current === null) storageRef.current = safeLocalStorage();
    const storage = storageRef.current;

    const treeRows = useMemo(() => collectTreeRows(workspace), [workspace]);
    const pages = useMemo(
        () => treeRows.filter((row): row is TreeRow & { page: ChangedPage } => row.page !== null).map((row) => row.page),
        [treeRows]
    );

    const [state, dispatch] = useReducer(
        reviewReducer,
        readViewMode(storage, features.visualCompare),
        createInitialState
    );

    const actions = useMemo<ReviewActions>(() => {
        const persistViewMode = (mode: ViewMode) => {
            try {
                storage?.setItem(MODE_STORAGE_KEY, mode);
            } catch (error) {
                // Without storage the choice lasts for this page view.
            }
        };
        return {
            setViewMode(mode) {
                persistViewMode(mode);
                dispatch({ type: 'setViewMode', mode });
            },
            setActivePage(index) {
                dispatch({ type: 'setActivePage', index });
            },
            setCollapsed(pageId, collapsed) {
                dispatch({ type: 'setCollapsed', pageId, collapsed });
            },
            setSelection(selection) {
                dispatch({ type: 'setSelection', selection });
            },
            setShortcutsOpen(open) {
                dispatch({ type: 'setShortcutsOpen', open });
            },
            showChangeInList(changeId) {
                persistViewMode('list');
                dispatch({ type: 'highlightChange', changeId });
            },
            clearHighlight() {
                dispatch({ type: 'clearHighlight' });
            },
            runSingleAction(contextPath, action) {
                dispatch({ type: 'setSingleAction', singleAction: { contextPath, action } satisfies SingleAction });
            },
            clearSingleAction() {
                dispatch({ type: 'setSingleAction', singleAction: null });
            },
        };
    }, [storage]);

    const data = useMemo<ReviewData>(
        () => ({ workspace, pages, treeRows, features, uris }),
        [workspace, pages, treeRows, features, uris]
    );

    return (
        <DataContext.Provider value={data}>
            <StateContext.Provider value={state}>
                <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
            </StateContext.Provider>
        </DataContext.Provider>
    );
}

function useRequiredContext<T>(context: React.Context<T | null>, name: string): T {
    const value = useContext(context);
    if (value === null) throw new Error(`${name} must be used inside a ReviewStateProvider`);
    return value;
}

export function useReviewState(): ReviewState {
    return useRequiredContext(StateContext, 'useReviewState');
}

export function useReviewActions(): ReviewActions {
    return useRequiredContext(ActionsContext, 'useReviewActions');
}

export function useReviewData(): ReviewData {
    return useRequiredContext(DataContext, 'useReviewData');
}

/**
 * Moves the review to a page the way the sidebar and the shortcuts do: the index
 * follows, the page scrolls to the top of the stream and focus goes either to the
 * page heading or back to its sidebar entry.
 */
export function useJumpToPage(): (index: number, focusPage: boolean) => void {
    const actions = useReviewActions();
    const { pages } = useReviewData();
    return useCallback(
        (index: number, focusPage: boolean) => {
            if (!pages.length) return;
            const target = clampPageIndex(index, pages.length);
            actions.setActivePage(target);
            focusWithoutScroll(focusPage ? pageElement(target) : sidebarLinkElement(target));
            scrollIntoView(pageElement(target), 'start');
        },
        [actions, pages.length]
    );
}
