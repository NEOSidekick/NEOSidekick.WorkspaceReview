import { useEffect, useRef } from 'react';
import {
    closePopup,
    countChangedNodes,
    reportPopupResults,
    shouldClosePopup,
    useReviewData,
} from '@neosidekick/workspace-review-core';
import type { PopupResult } from '@neosidekick/workspace-review-core';

/**
 * Reports what the publishing action that led to this page did, together with
 * what is still left in the reviewed pages, and closes the popup once nothing
 * is. Runs once per page view: the server hands each result to one page only.
 */
export function usePopupResults(results: PopupResult[]): void {
    const { pages, uris, isPopup } = useReviewData();
    const done = useRef(false);

    useEffect(() => {
        if (!isPopup || done.current) return;
        done.current = true;
        const remainingInScope = countChangedNodes(pages);
        reportPopupResults(results, remainingInScope);
        if (shouldClosePopup(results, remainingInScope)) closePopup(uris.exit);
    }, [isPopup, pages, results, uris.exit]);
}
