import { deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { resolveReviewContext } from './context';

const empty = { sidebarIndex: null, changeIndex: null, changePageIndex: null, pageIndex: null };

describe('keyboard context resolution', () => {
    it('prefers the focused sidebar entry', () => {
        deepStrictEqual(resolveReviewContext({ ...empty, sidebarIndex: '2', pageIndex: '5' }, 0), {
            index: 2,
            inSidebar: true,
            change: -1,
        });
    });

    it('resolves a focused change to its page and position', () => {
        deepStrictEqual(resolveReviewContext({ ...empty, changeIndex: '3', changePageIndex: '1' }, 0), {
            index: 1,
            inSidebar: false,
            change: 3,
        });
    });

    it('resolves a focused page heading', () => {
        deepStrictEqual(resolveReviewContext({ ...empty, pageIndex: '4' }, 0), {
            index: 4,
            inSidebar: false,
            change: -1,
        });
    });

    it('falls back to the page at the top of the stream', () => {
        deepStrictEqual(resolveReviewContext(empty, 7), { index: 7, inSidebar: false, change: -1 });
    });

    it('never falls back to a negative page index', () => {
        deepStrictEqual(resolveReviewContext(empty, -1), { index: 0, inSidebar: false, change: -1 });
    });

    it('ignores markers that are not a number', () => {
        deepStrictEqual(resolveReviewContext({ ...empty, sidebarIndex: 'x' }, 2), {
            index: 2,
            inSidebar: false,
            change: -1,
        });
    });
});
