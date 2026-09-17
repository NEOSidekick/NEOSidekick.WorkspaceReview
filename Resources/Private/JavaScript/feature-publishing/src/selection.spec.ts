import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import {
    allSelectionState,
    discardScope,
    pageSelectionState,
    propagateUpwards,
    selectAll,
    toggleChange,
    togglePage,
} from './selection';
import type { SelectablePage } from './selection';

const newParent: SelectablePage = {
    nodePath: '/sites/example/new-parent',
    isNew: true,
    isMoved: false,
    changes: [{ contextPath: 'parent-a' }, { contextPath: 'parent-b' }],
};

const editedPage: SelectablePage = {
    nodePath: '/sites/example/new-parent/child',
    isNew: false,
    isMoved: false,
    changes: [{ contextPath: 'child-a' }],
};

const unrelatedPage: SelectablePage = {
    nodePath: '/sites/example/other',
    isNew: true,
    isMoved: false,
    changes: [{ contextPath: 'other-a' }],
};

const pages = [newParent, editedPage, unrelatedPage];

describe('selection propagation', () => {
    it('checks the new ancestor pages of a new node', () => {
        const selection = toggleChange(
            pages,
            {
                contextPath: 'content-a',
                nodePath: '/sites/example/new-parent/child/main/content',
                isNew: true,
                isMoved: false,
            },
            true,
            new Set(),
        );
        deepStrictEqual([...selection].sort(), ['content-a', 'parent-a', 'parent-b']);
    });

    it('leaves a plain edit alone', () => {
        const selection = toggleChange(
            pages,
            {
                contextPath: 'content-a',
                nodePath: '/sites/example/new-parent/child/main/content',
                isNew: false,
                isMoved: false,
            },
            true,
            new Set(),
        );
        deepStrictEqual([...selection], ['content-a']);
    });

    it('never propagates downwards', () => {
        const selection = togglePage(pages, newParent, true, new Set());
        deepStrictEqual([...selection].sort(), ['parent-a', 'parent-b']);
    });

    it('unchecks the ancestors again', () => {
        const checked = toggleChange(
            pages,
            { contextPath: 'content-a', nodePath: '/sites/example/new-parent/child/x', isMoved: true, isNew: false },
            true,
            new Set(),
        );
        const unchecked = toggleChange(
            pages,
            { contextPath: 'content-a', nodePath: '/sites/example/new-parent/child/x', isMoved: true, isNew: false },
            false,
            checked,
        );
        deepStrictEqual([...unchecked], []);
    });

    it('ignores pages that are not an ancestor', () => {
        const selection = propagateUpwards(pages, '/sites/example/new-parent/child/x', '', true, new Set());
        strictEqual(selection.has('other-a'), false);
    });

    it('matches whole path segments and stays inside the dimensions of the change', () => {
        const page = (nodePath: string, contextPath: string): SelectablePage => ({
            nodePath,
            isNew: true,
            isMoved: false,
            changes: [{ contextPath }],
        });
        const variants = [
            page('/sites/example/news', '/sites/example/news@user-admin;language=en'),
            page('/sites/example/newsletter', '/sites/example/newsletter@user-admin;language=en'),
            page('/sites/example/newsletter', '/sites/example/newsletter@user-admin;language=de'),
        ];
        const selection = toggleChange(
            variants,
            {
                contextPath: '/sites/example/newsletter/main/text@user-admin;language=en',
                nodePath: '/sites/example/newsletter/main/text',
                isNew: true,
                isMoved: false,
            },
            true,
            new Set(),
        );
        deepStrictEqual([...selection].sort(), [
            '/sites/example/newsletter/main/text@user-admin;language=en',
            '/sites/example/newsletter@user-admin;language=en',
        ]);
    });

    it('takes the hidden new ancestor pages of a filtered review along', () => {
        // Only the child page is shown; its new parent has to be published with it.
        const newChild: SelectablePage = { ...editedPage, isNew: true };
        const all = selectAll([newParent, newChild, unrelatedPage], [newChild], true);
        deepStrictEqual([...all].sort(), ['child-a', 'parent-a', 'parent-b']);
        strictEqual(allSelectionState([newChild], all), 'all');
    });

    it('reports the selection state of a page and of the whole stream', () => {
        const all = selectAll(pages, pages, true);
        strictEqual(allSelectionState(pages, all), 'all');
        strictEqual(allSelectionState(pages, new Set()), 'none');
        strictEqual(pageSelectionState(newParent, new Set(['parent-a'])), 'some');
        strictEqual(pageSelectionState(newParent, all), 'all');
    });

    it('discards only the shown page without its hidden publishing dependencies', () => {
        const newChild = { ...editedPage, isNew: true };
        const selected = selectAll([newParent, newChild], [newChild], true);
        deepStrictEqual([...discardScope([newChild], selected)], ['child-a']);
        deepStrictEqual([...discardScope([newChild], new Set())], ['child-a']);
    });

    it('discards only selected shown changes and keeps dimension variants separate', () => {
        const page = {
            ...editedPage,
            changes: [
                { contextPath: '/child@user-admin;language=de' },
                { contextPath: '/child/main/text@user-admin;language=de' },
            ],
        };
        deepStrictEqual(
            [
                ...discardScope(
                    [page],
                    new Set(['/child@user-admin;language=de', '/child@user-admin;language=en', 'parent-a']),
                ),
            ],
            ['/child@user-admin;language=de'],
        );
        deepStrictEqual([...discardScope([page], new Set(['parent-a']))], []);
    });
});
