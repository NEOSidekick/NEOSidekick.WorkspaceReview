// The module itself, not the package index: the index also loads the
// components with their stylesheets, which the specs of these pure helpers
// cannot run.
import { dimensionsOf } from '@neosidekick/workspace-review-core/src/domain/pages';
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
 * checks every such ancestor page of the same dimensions and all of its
 * changes. A plain edit propagates nothing, and nothing ever propagates
 * downwards.
 */
export function propagateUpwards(
    pages: SelectablePage[],
    nodePath: string,
    dimensions: string,
    checked: boolean,
    selection: Selection,
): Set<string> {
    let next = new Set(selection);
    pages.forEach((page) => {
        if (!page.isNew && !page.isMoved) return;
        // Whole path segments only: "/news" is no ancestor of "/newsletter".
        if (nodePath !== page.nodePath && nodePath.indexOf(`${page.nodePath}/`) !== 0) return;
        if (!page.changes.length || dimensionsOf(page.changes[0].contextPath) !== dimensions) return;
        next = withChanges(next, page, checked);
    });
    return next;
}

/** Checking or unchecking a single change card. */
export function toggleChange(
    pages: SelectablePage[],
    change: Pick<NodeChange, 'contextPath' | 'nodePath' | 'isNew' | 'isMoved'>,
    checked: boolean,
    selection: Selection,
): Set<string> {
    const next = new Set(selection);
    if (checked) next.add(change.contextPath);
    else next.delete(change.contextPath);
    if (!change.isNew && !change.isMoved) return next;
    return propagateUpwards(pages, change.nodePath, dimensionsOf(change.contextPath), checked, next);
}

/** The page checkbox checks every change of its page, then propagates upwards. */
export function togglePage(
    pages: SelectablePage[],
    page: SelectablePage,
    checked: boolean,
    selection: Selection,
): Set<string> {
    const next = withChanges(selection, page, checked);
    if ((!page.isNew && !page.isMoved) || !page.changes.length) return next;
    return propagateUpwards(pages, page.nodePath, dimensionsOf(page.changes[0].contextPath), checked, next);
}

/**
 * The toolbar checkbox above the stream: every change of the shown pages. A
 * document filter may hide the new or moved pages a shown page lives in, so
 * each page propagates over all pages and takes those ancestors along.
 */
export function selectAll(allPages: SelectablePage[], shownPages: SelectablePage[], checked: boolean): Set<string> {
    if (!checked) return new Set<string>();
    return shownPages.reduce((next, page) => togglePage(allPages, page, true, next), new Set<string>());
}

export type SelectionState = 'none' | 'some' | 'all';

export function pageSelectionState(page: SelectablePage, selection: Selection): SelectionState {
    if (!page.changes.length) return 'none';
    const selected = page.changes.filter((change) => selection.has(change.contextPath)).length;
    if (selected === 0) return 'none';
    return selected === page.changes.length ? 'all' : 'some';
}

export function allSelectionState(pages: SelectablePage[], selection: Selection): SelectionState {
    // Counted over the given pages only: the selection may hold changes of
    // pages a document filter hides.
    let total = 0;
    let selected = 0;
    pages.forEach((page) =>
        page.changes.forEach((change) => {
            total++;
            if (selection.has(change.contextPath)) selected++;
        }),
    );
    if (!total || !selected) return 'none';
    return selected === total ? 'all' : 'some';
}
