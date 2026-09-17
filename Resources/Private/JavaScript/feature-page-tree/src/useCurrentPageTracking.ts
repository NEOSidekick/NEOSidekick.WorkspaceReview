import { useEffect } from 'react';
import { PAGE_ATTRIBUTE, useReviewActions, useReviewData } from '@neosidekick/workspace-review-core';

/**
 * Keeps the sidebar on the page shown at the top of the stream. The observer
 * watches a thin band below the Neos toolbar, so the page whose heading has just
 * passed it becomes the current one; the topmost band member wins when a short
 * page shares it with the next one.
 */
export function useCurrentPageTracking(pageCount: number): void {
    const actions = useReviewActions();
    const { pages } = useReviewData();

    useEffect(() => {
        if (!pageCount || typeof IntersectionObserver === 'undefined') return;
        const headings = Array.from(document.querySelectorAll<HTMLElement>(`[${PAGE_ATTRIBUTE}]`));
        if (!headings.length) return;

        const visible = new Set<number>();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const index = Number(entry.target.getAttribute(PAGE_ATTRIBUTE));
                    if (entry.isIntersecting) visible.add(index);
                    else visible.delete(index);
                });
                if (!visible.size) return;
                actions.setActivePage(Math.min(...visible));
            },
            // Everything from just below the toolbar down to the middle of the
            // viewport counts as "currently reviewed".
            { rootMargin: '-56px 0px -50% 0px', threshold: 0 }
        );
        headings.forEach((heading) => observer.observe(heading));
        return () => observer.disconnect();
    }, [actions, pageCount, pages]);
}
