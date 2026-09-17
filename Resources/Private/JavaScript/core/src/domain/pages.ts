import type { ChangedPage, NodeRef, Workspace } from '../types';

/** One row of the page tree sidebar, flattened over sites and dimensions. */
export interface TreeRow {
    key: string;
    node: NodeRef;
    depth: number;
    hasChildren: boolean;
    /** null for an unchanged ancestor, which is listed greyed and unlinked. */
    page: ChangedPage | null;
    /** Index into the ordered list of changed pages; -1 for an unchanged ancestor. */
    pageIndex: number;
}

/**
 * Flattens the tree entries of every site and dimension into the order the
 * server produced them, numbering the changed pages as the review stream shows
 * them. Both lists must stay in step: keyboard navigation, the progress bar and
 * the current-page tracking address pages by that index.
 */
export function collectTreeRows(workspace: Workspace | null | undefined): TreeRow[] {
    const rows: TreeRow[] = [];
    let pageIndex = 0;
    (workspace?.sites ?? []).forEach((site) => {
        site.dimensions.forEach((dimension) => {
            dimension.pages.forEach((entry, entryIndex) => {
                rows.push({
                    key: `${site.name}-${dimension.hash}-${entry.node.identifier}-${entryIndex}`,
                    node: entry.node,
                    depth: entry.depth,
                    hasChildren: entry.hasChildren,
                    page: entry.page,
                    pageIndex: entry.page ? pageIndex++ : -1,
                });
            });
        });
    });
    return rows;
}

/** Clamps a page index to the existing pages, as the keyboard navigation does. */
export function clampPageIndex(index: number, pageCount: number): number {
    if (pageCount <= 0) return -1;
    return Math.max(0, Math.min(index, pageCount - 1));
}

/**
 * The context path of the page node, which the "edit page" button appends to the
 * server-built rebase URI. `ChangedPage` carries only the absolute node path, so
 * the workspace and dimension part is taken from a change of the same page –
 * every change of a page shares it.
 */
export function pageContextPath(page: Pick<ChangedPage, 'nodePath' | 'changes'>): string | null {
    const sample = page.changes[0]?.contextPath;
    if (!sample) return null;
    const separator = sample.indexOf('@');
    return separator === -1 ? page.nodePath : page.nodePath + sample.slice(separator);
}

/** Appends a query argument to a URI that may already carry one. */
export function appendQueryArgument(uri: string, name: string, value: string): string {
    return `${uri}${uri.includes('?') ? '&' : '?'}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

/**
 * The module index, for the footer's back link. `showAction` builds no index
 * URI, so it is derived from the current location.
 */
export function moduleIndexUri(pathname: string): string {
    const index = pathname.replace(/\/show\/*$/, '');
    return index || '/';
}
