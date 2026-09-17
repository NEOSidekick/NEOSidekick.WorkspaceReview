import { useCallback, useMemo } from 'react';
import { useReviewActions, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';
import type { ChangedPage, NodeChange } from '@neosidekick/workspace-review-core';

import { allSelectionState, selectAll, toggleChange, togglePage } from './selection';
import type { SelectionState } from './selection';

/** Binds the pure selection helpers to the review state. */
export function useSelection() {
    const { pages } = useReviewData();
    const { selection, singleAction } = useReviewState();
    const actions = useReviewActions();

    const toggleOneChange = useCallback(
        (change: NodeChange, checked: boolean) => actions.setSelection(toggleChange(pages, change, checked, selection)),
        [actions, pages, selection]
    );

    const toggleOnePage = useCallback(
        (page: ChangedPage, checked: boolean) => actions.setSelection(togglePage(pages, page, checked, selection)),
        [actions, pages, selection]
    );

    const toggleAll = useCallback(
        (checked: boolean) => actions.setSelection(selectAll(pages, checked)),
        [actions, pages]
    );

    return {
        selection,
        /** While a card publishes itself, its own hidden field is the only entry. */
        disabled: singleAction !== null,
        toggleOneChange,
        toggleOnePage,
        toggleAll,
    };
}

/**
 * Only the select-all checkbox is about the whole stream; computing it per
 * change checkbox would walk every page for every card.
 */
export function useWholeSelectionState(): SelectionState {
    const { pages } = useReviewData();
    const { selection } = useReviewState();
    return useMemo(() => allSelectionState(pages, selection), [pages, selection]);
}
