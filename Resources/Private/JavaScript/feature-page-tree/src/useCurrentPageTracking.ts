import { useEffect } from 'react';
import { PAGE_ATTRIBUTE, useReviewActions, useReviewData } from '@neosidekick/workspace-review-core';

/**
 * Keeps the sidebar on the page shown at the top of the stream, with the
 * computation of CodeQ.WorkspaceReview: the last page heading at or above the
 * toolbar line is the current one, and the end of the document always belongs
 * to the last page, which a short final page cannot reach the line from.
 *
 * The line is the heading's own `scroll-margin-top`, so the offset the anchor
 * navigation uses and the one this reads are the same value.
 */
export function useCurrentPageTracking(): void {
    const actions = useReviewActions();
    const { pages } = useReviewData();

    useEffect(() => {
        if (!pages.length) return;
        const headings = Array.from(document.querySelectorAll<HTMLElement>(`[${PAGE_ATTRIBUTE}]`));
        if (!headings.length) return;

        let frameRequest = 0;

        function pageIndexOf(heading: HTMLElement): number {
            return Number(heading.getAttribute(PAGE_ATTRIBUTE));
        }

        function updateFromScroll() {
            frameRequest = 0;
            const offset = parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 0;
            let index = pageIndexOf(headings[0]);
            headings.forEach((heading) => {
                if (heading.getBoundingClientRect().top <= offset + 1) index = pageIndexOf(heading);
            });
            const scroller = document.scrollingElement;
            if (
                scroller &&
                scroller.scrollTop > 0 &&
                Math.ceil(scroller.scrollTop + scroller.clientHeight) >= scroller.scrollHeight
            ) {
                index = pageIndexOf(headings[headings.length - 1]);
            }
            actions.setActivePage(index);
        }

        function scheduleUpdate() {
            if (frameRequest) return;
            frameRequest = requestAnimationFrame(updateFromScroll);
        }

        // Capture also observes scrolling inside a scroll container of the module.
        document.addEventListener('scroll', scheduleUpdate, { capture: true, passive: true });
        window.addEventListener('resize', scheduleUpdate);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);
        observer?.observe(document.body);
        updateFromScroll();

        return () => {
            document.removeEventListener('scroll', scheduleUpdate, { capture: true });
            window.removeEventListener('resize', scheduleUpdate);
            observer?.disconnect();
            if (frameRequest) cancelAnimationFrame(frameRequest);
        };
    }, [actions, pages]);
}
