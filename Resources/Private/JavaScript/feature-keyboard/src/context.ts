// Imported from the module file rather than the package index: the index also
// pulls in components with stylesheet imports, which the unit test runner cannot load.
import {
    CHANGE_ATTRIBUTE,
    CHANGE_PAGE_ATTRIBUTE,
    EDITING_SELECTOR,
    LINK_ATTRIBUTE,
    PAGE_ATTRIBUTE,
} from '@neosidekick/workspace-review-core/src/dom';

export interface ContextAttributes {
    sidebarIndex: string | null;
    changeIndex: string | null;
    changePageIndex: string | null;
    pageIndex: string | null;
}

export interface ReviewKeyboardContext {
    /** Index of the page a shortcut acts on, -1 when there is none. */
    index: number;
    inSidebar: boolean;
    /** Index of the focused change within the page, -1 when none is focused. */
    change: number;
}

function toIndex(value: string | null): number {
    if (value === null) return -1;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : -1;
}

/**
 * The page a shortcut acts on: the focused sidebar entry, change card or page
 * heading, otherwise the page currently shown at the top of the stream.
 */
export function resolveReviewContext(attributes: ContextAttributes, activePageIndex: number): ReviewKeyboardContext {
    const sidebarIndex = toIndex(attributes.sidebarIndex);
    if (sidebarIndex !== -1) return { index: sidebarIndex, inSidebar: true, change: -1 };

    const changeIndex = toIndex(attributes.changeIndex);
    const changePageIndex = toIndex(attributes.changePageIndex);
    if (changeIndex !== -1 && changePageIndex !== -1) {
        return { index: changePageIndex, inSidebar: false, change: changeIndex };
    }

    const pageIndex = toIndex(attributes.pageIndex);
    if (pageIndex !== -1) return { index: pageIndex, inSidebar: false, change: -1 };

    return { index: Math.max(activePageIndex, 0), inSidebar: false, change: -1 };
}

/** Reads the nearest review markers around the event target. */
export function readContextAttributes(target: Element): ContextAttributes {
    const change = target.closest(`[${CHANGE_ATTRIBUTE}]`);
    return {
        sidebarIndex: target.closest(`[${LINK_ATTRIBUTE}]`)?.getAttribute(LINK_ATTRIBUTE) ?? null,
        changeIndex: change?.getAttribute(CHANGE_ATTRIBUTE) ?? null,
        changePageIndex: change?.getAttribute(CHANGE_PAGE_ATTRIBUTE) ?? null,
        pageIndex: target.closest(`[${PAGE_ATTRIBUTE}]`)?.getAttribute(PAGE_ATTRIBUTE) ?? null,
    };
}

/** Shortcuts stay off inside form controls and buttons. */
export function isEditingContext(target: Element): boolean {
    return target.closest(EDITING_SELECTOR) !== null;
}
