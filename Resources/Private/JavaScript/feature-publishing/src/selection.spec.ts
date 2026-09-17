import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { allSelectionState, pageSelectionState, propagateUpwards, selectAll, toggleChange, togglePage } from './selection';
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
            new Set()
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
            new Set()
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
            new Set()
        );
        const unchecked = toggleChange(
            pages,
            { contextPath: 'content-a', nodePath: '/sites/example/new-parent/child/x', isMoved: true, isNew: false },
            false,
            checked
        );
        deepStrictEqual([...unchecked], []);
    });

    it('ignores pages that are not an ancestor', () => {
        const selection = propagateUpwards(pages, '/sites/example/new-parent/child/x', true, new Set());
        strictEqual(selection.has('other-a'), false);
    });

    it('reports the selection state of a page and of the whole stream', () => {
        const all = selectAll(pages, true);
        strictEqual(allSelectionState(pages, all), 'all');
        strictEqual(allSelectionState(pages, new Set()), 'none');
        strictEqual(pageSelectionState(newParent, new Set(['parent-a'])), 'some');
        strictEqual(pageSelectionState(newParent, all), 'all');
    });
});
