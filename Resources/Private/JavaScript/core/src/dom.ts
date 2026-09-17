/**
 * The review stream is a React tree, but keyboard navigation moves focus between
 * pages and cards the way the Fluid module did. These attributes are the single
 * place where both sides agree on how a page or a change is addressed.
 */
export const LINK_ATTRIBUTE = 'data-review-link';
export const PAGE_ATTRIBUTE = 'data-review-page';
export const CHANGE_ATTRIBUTE = 'data-review-change';
export const CHANGE_PAGE_ATTRIBUTE = 'data-review-change-page';

/** Shortcuts stay off inside form controls, exactly as in CodeQ.WorkspaceReview. */
export const EDITING_SELECTOR =
    'input, select, textarea, button, [contenteditable=""], [contenteditable="true"], a.neos-button';

function query(attribute: string, value: number): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[${attribute}="${value}"]`);
}

export function sidebarLinkElement(index: number): HTMLElement | null {
    return query(LINK_ATTRIBUTE, index);
}

export function pageElement(index: number): HTMLElement | null {
    return query(PAGE_ATTRIBUTE, index);
}

export function changeElements(pageIndex: number): HTMLElement[] {
    return Array.from(
        document.querySelectorAll<HTMLElement>(`[${CHANGE_PAGE_ATTRIBUTE}="${pageIndex}"][${CHANGE_ATTRIBUTE}]`)
    );
}

export function changeElement(pageIndex: number, changeIndex: number): HTMLElement | null {
    return document.querySelector<HTMLElement>(
        `[${CHANGE_PAGE_ATTRIBUTE}="${pageIndex}"][${CHANGE_ATTRIBUTE}="${changeIndex}"]`
    );
}

export function focusWithoutScroll(element: HTMLElement | null): void {
    element?.focus({ preventScroll: true });
}

export function scrollIntoView(element: HTMLElement | null, block: ScrollLogicalPosition = 'start'): void {
    element?.scrollIntoView({ block, behavior: 'instant' as ScrollBehavior });
}

/** Keeps a sidebar row inside its own scroll box without moving the review stream. */
export function revealInScroller(element: HTMLElement | null, scroller: HTMLElement | null): void {
    if (!element || !scroller) return;
    const bounds = element.getBoundingClientRect();
    const scrollerBounds = scroller.getBoundingClientRect();
    if (bounds.top < scrollerBounds.top) scroller.scrollTop += bounds.top - scrollerBounds.top;
    else if (bounds.bottom > scrollerBounds.bottom) scroller.scrollTop += bounds.bottom - scrollerBounds.bottom;
}
