import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import {
    appendQueryArgument,
    clampPageIndex,
    collectTreeRows,
    countChangedNodes,
    filterTreeRows,
    matchesDocument,
    moduleIndexUri,
    pageContextPath,
    parseDocumentFilter,
} from './pages';
import type { TreeRow } from './pages';
import type { Workspace } from '../types';

function node(identifier: string) {
    return { identifier, label: identifier, icon: 'fas fa-file', dimensionLabel: null, isHidden: false };
}

function page(id: string, nodePath: string, changeCount: number) {
    return {
        id,
        node: node(id),
        nodePath,
        breadcrumb: [],
        isNew: false,
        isMoved: false,
        isRemoved: false,
        previewUri: null,
        basePreviewUri: null,
        openUri: null,
        changes: Array.from({ length: changeCount }, (_unused, index) => ({
            id: `${id}-change-${index}`,
            identifier: `${id}-c${index}`,
            contextPath: `${nodePath}/main/c${index}@user-admin;language=de`,
            nodePath: `${nodePath}/main/c${index}`,
            label: 'c',
            typeLabel: 'Text',
            isNew: false,
            isMoved: false,
            isHidden: false,
            isRemoved: false,
            lastModified: 1700000000 + index,
            publishable: true,
            properties: [],
        })),
    };
}

const workspace: Workspace = {
    name: 'user-admin',
    title: 'Admin',
    baseWorkspaceTitle: 'Live',
    canPublishToBase: true,
    sites: [
        {
            name: 'example',
            dimensions: [
                {
                    hash: 'de',
                    label: 'Deutsch',
                    pages: [
                        { node: node('root'), depth: 0, hasChildren: true, page: null },
                        { node: node('a'), depth: 1, hasChildren: false, page: page('a-de', '/sites/example/a', 2) },
                    ],
                },
                {
                    hash: 'en',
                    label: 'English',
                    pages: [
                        { node: node('a'), depth: 1, hasChildren: false, page: page('a-en', '/sites/example/a', 1) },
                    ],
                },
            ],
        },
    ],
};

describe('document filter', () => {
    const inLanguage = (nodePath: string, language: string) => ({
        nodePath,
        changes: [{ contextPath: `${nodePath}/main/text@user-admin;language=${language}` }],
    });

    it('reads a context path, a node path and nothing', () => {
        deepStrictEqual(parseDocumentFilter('/sites/example/a@user-admin;language=en'), {
            nodePath: '/sites/example/a',
            dimensions: 'language=en',
        });
        deepStrictEqual(parseDocumentFilter('/sites/example/a'), { nodePath: '/sites/example/a', dimensions: null });
        // What is left of a context path whose ";" was not URL-encoded.
        deepStrictEqual(parseDocumentFilter('/sites/example/a@user-admin'), {
            nodePath: '/sites/example/a',
            dimensions: null,
        });
        strictEqual(parseDocumentFilter(''), null);
        strictEqual(parseDocumentFilter(undefined), null);
    });

    it('matches the node path and, if given, the dimensions', () => {
        const english = parseDocumentFilter('/sites/example/a@live;language=en')!;
        strictEqual(matchesDocument(inLanguage('/sites/example/a', 'en'), english), true);
        strictEqual(matchesDocument(inLanguage('/sites/example/a', 'de'), english), false);
        strictEqual(matchesDocument(inLanguage('/sites/example/a/b', 'en'), english), false);
        strictEqual(
            matchesDocument(inLanguage('/sites/example/a', 'de'), parseDocumentFilter('/sites/example/a')!),
            true,
        );
    });

    it('keeps the matching page with its ancestors and numbers it anew', () => {
        const row = (key: string, depth: number, changedPage: TreeRow['page'], pageIndex: number): TreeRow => ({
            key,
            node: node(key),
            depth,
            hasChildren: true,
            page: changedPage,
            pageIndex,
        });
        const rows = [
            row('root', 0, null, -1),
            row('blog', 1, page('blog', '/sites/example/blog', 1), 0),
            row('post', 2, page('post', '/sites/example/blog/post', 1), 1),
            row('other', 1, page('other', '/sites/example/other', 1), 2),
        ];
        const filtered = filterTreeRows(rows, parseDocumentFilter('/sites/example/blog/post')!);
        deepStrictEqual(
            filtered.map((entry) => [entry.key, entry.page?.id ?? null, entry.pageIndex]),
            [
                ['root', null, -1],
                // A changed ancestor is listed without its own changes.
                ['blog', null, -1],
                ['post', 'post', 0],
            ],
        );
    });
});

describe('page order helpers', () => {
    it('counts every changed node once, over all pages', () => {
        const change = (contextPath: string) => ({ contextPath });
        strictEqual(countChangedNodes([]), 0);
        strictEqual(countChangedNodes([{ changes: [] }]), 0);
        strictEqual(
            countChangedNodes([
                { changes: [change('/a@user;language=de'), change('/b@user;language=de')] },
                // The same path in another dimension is a node of its own.
                { changes: [change('/a@user;language=en'), change('/a@user;language=de')] },
            ]),
            3,
        );
    });

    it('numbers the changed pages across dimensions and keeps the unchanged ancestors', () => {
        const rows = collectTreeRows(workspace);
        deepStrictEqual(
            rows.map((row) => row.pageIndex),
            [-1, 0, 1],
        );
        strictEqual(rows[0].page, null);
        deepStrictEqual(
            rows.filter((row) => row.page !== null).map((row) => row.page?.id),
            ['a-de', 'a-en'],
        );
    });

    it('survives an empty workspace', () => {
        deepStrictEqual(collectTreeRows(null), []);
        strictEqual(clampPageIndex(3, 0), -1);
    });

    it('clamps a page index to the existing pages', () => {
        strictEqual(clampPageIndex(-2, 3), 0);
        strictEqual(clampPageIndex(9, 3), 2);
    });

    it('derives the page context path from one of its changes', () => {
        strictEqual(pageContextPath(page('a-de', '/sites/example/a', 1)), '/sites/example/a@user-admin;language=de');
        strictEqual(pageContextPath(page('a-de', '/sites/example/a', 0)), null);
    });

    it('appends arguments to a URI that already carries a query', () => {
        strictEqual(
            appendQueryArgument('/neos/management/workspaces/rebase?moduleArguments[a]=1', 'b', '/sites/x@user'),
            '/neos/management/workspaces/rebase?moduleArguments[a]=1&b=%2Fsites%2Fx%40user',
        );
        strictEqual(appendQueryArgument('/neos/x', 'b', 'c'), '/neos/x?b=c');
    });

    it('derives the module index from the show URI', () => {
        strictEqual(moduleIndexUri('/neos/management/workspaces/show'), '/neos/management/workspaces');
        strictEqual(moduleIndexUri('/neos/management/workspaces'), '/neos/management/workspaces');
    });
});
