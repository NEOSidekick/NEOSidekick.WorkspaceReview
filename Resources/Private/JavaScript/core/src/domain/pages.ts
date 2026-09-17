import type { ChangedPage, NodeChange, NodeRef, Workspace } from '../types';

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
 * them. Both lists must stay in step: keyboard navigation and the current-page
 * tracking address pages by that index.
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

/**
 * The dimension part of a context path ("/path@workspace;language=en"). The
 * same node path exists once per dimension combination, and each variant is
 * published on its own.
 */
export function dimensionsOf(contextPath: string): string {
    const separator = contextPath.indexOf(';');
    return separator === -1 ? '' : contextPath.slice(separator + 1);
}

/** Narrows the review to one document; without dimensions to all its variants. */
export interface DocumentFilter {
    nodePath: string;
    dimensions: string | null;
}

/**
 * Reads the optional "document" argument of the module: the context path of a
 * document node, or its plain node path. The workspace part is ignored - the
 * review is about the workspace it was opened for.
 */
export function parseDocumentFilter(value: string | null | undefined): DocumentFilter | null {
    const document = (value || '').trim();
    if (!document) return null;
    const separator = document.indexOf('@');
    if (separator === -1) return { nodePath: document, dimensions: null };
    // No dimension part: a site without dimensions, or a link whose ";" was
    // not encoded - query strings end an argument there, which cuts it off.
    const dimensions = document.includes(';') ? dimensionsOf(document) : null;
    return { nodePath: document.slice(0, separator), dimensions };
}

export function matchesDocument(
    page: { nodePath: string; changes: Pick<NodeChange, 'contextPath'>[] },
    filter: DocumentFilter,
): boolean {
    if (page.nodePath !== filter.nodePath) return false;
    if (filter.dimensions === null) return true;
    const sample = page.changes[0]?.contextPath;
    return sample !== undefined && dimensionsOf(sample) === filter.dimensions;
}

/**
 * The rows of the matching pages with the ancestors that lead to them,
 * numbered anew. An ancestor that has changes of its own is listed like an
 * unchanged one, because its changes are not part of the narrowed review.
 */
export function filterTreeRows(rows: TreeRow[], filter: DocumentFilter): TreeRow[] {
    const result: TreeRow[] = [];
    const ancestors: TreeRow[] = [];
    let pageIndex = 0;
    rows.forEach((row) => {
        while (ancestors.length && ancestors[ancestors.length - 1].depth >= row.depth) ancestors.pop();
        if (row.page && matchesDocument(row.page, filter)) {
            ancestors.forEach((ancestor) => {
                if (!result.some((listed) => listed.key === ancestor.key)) {
                    result.push({ ...ancestor, page: null, pageIndex: -1 });
                }
            });
            result.push({ ...row, pageIndex: pageIndex++ });
        }
        ancestors.push(row);
    });
    return result;
}

/**
 * The number of changed elements on the given pages: the distinct context
 * paths that can be published or discarded. An element counts once, however
 * many of its properties changed.
 */
export function countChangedNodes(pages: { changes: Pick<NodeChange, 'contextPath'>[] }[]): number {
    const contextPaths = new Set<string>();
    pages.forEach((page) => page.changes.forEach((change) => contextPaths.add(change.contextPath)));
    return contextPaths.size;
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
