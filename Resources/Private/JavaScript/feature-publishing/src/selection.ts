import type { ChangedPage, NodeChange } from '@neosidekick/workspace-review-core';

export type Selection = ReadonlySet<string>;

export type SelectablePage = Pick<ChangedPage, 'nodePath' | 'isNew' | 'isMoved'> & {
    changes: Pick<NodeChange, 'contextPath'>[];
};

function withChanges(selection: Selection, page: SelectablePage, checked: boolean): Set<string> {
    const next = new Set(selection);
    page.changes.forEach((change) => {
        if (checked) next.add(change.contextPath);
        else next.delete(change.contextPath);
    });
    return next;
}

/**
 * Mirrors the core module's propagation: a new or moved node can only be
 * published together with the new or moved pages it lives in, so checking it
 * checks every such ancestor page and all of its changes. A plain edit
 * propagates nothing, and nothing ever propagates downwards.
 */
export function propagateUpwards(
    pages: SelectablePage[],
    nodePath: string,
    checked: boolean,
    selection: Selection
): Set<string> {
    let next = new Set(selection);
    const path = `${nodePath}/`;
    pages.forEach((page) => {
        if (!page.isNew && !page.isMoved) return;
        if (path.indexOf(page.nodePath) !== 0) return;
        next = withChanges(next, page, checked);
    });
    return next;
}

/** Checking or unchecking a single change card. */
export function toggleChange(
    pages: SelectablePage[],
    change: Pick<NodeChange, 'contextPath' | 'nodePath' | 'isNew' | 'isMoved'>,
    checked: boolean,
    selection: Selection
): Set<string> {
    const next = new Set(selection);
    if (checked) next.add(change.contextPath);
    else next.delete(change.contextPath);
    if (!change.isNew && !change.isMoved) return next;
    return propagateUpwards(pages, change.nodePath, checked, next);
}

/** The page checkbox checks every change of its page, then propagates upwards. */
export function togglePage(
    pages: SelectablePage[],
    page: SelectablePage,
    checked: boolean,
    selection: Selection
): Set<string> {
    const next = withChanges(selection, page, checked);
    if (!page.isNew && !page.isMoved) return next;
    return propagateUpwards(pages, page.nodePath, checked, next);
}

/** The toolbar checkbox above the stream. */
export function selectAll(pages: SelectablePage[], checked: boolean): Set<string> {
    const next = new Set<string>();
    if (!checked) return next;
    pages.forEach((page) => page.changes.forEach((change) => next.add(change.contextPath)));
    return next;
}

export type SelectionState = 'none' | 'some' | 'all';

export function pageSelectionState(page: SelectablePage, selection: Selection): SelectionState {
    if (!page.changes.length) return 'none';
    const selected = page.changes.filter((change) => selection.has(change.contextPath)).length;
    if (selected === 0) return 'none';
    return selected === page.changes.length ? 'all' : 'some';
}

export function allSelectionState(pages: SelectablePage[], selection: Selection): SelectionState {
    const total = pages.reduce((sum, page) => sum + page.changes.length, 0);
    if (!total) return 'none';
    if (selection.size === 0) return 'none';
    return selection.size >= total ? 'all' : 'some';
}
