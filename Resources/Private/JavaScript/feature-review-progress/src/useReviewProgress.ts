import { useMemo } from 'react';
import { isReviewed, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';

/** Reviewed pages out of all changed pages, for the sidebar progress. */
export function useReviewProgress() {
    const { pages } = useReviewData();
    const { marks } = useReviewState();
    return useMemo(() => {
        const total = pages.length;
        const done = pages.filter((page) => isReviewed(marks, page.id)).length;
        return { total, done, complete: total > 0 && done === total, ratio: total ? done / total : 0 };
    }, [pages, marks]);
}
