import { useEffect } from 'react';
import {
    changeElement,
    changeElements,
    focusWithoutScroll,
    pageElement,
    scrollIntoView,
    sidebarLinkElement,
    useJumpToPage,
    useReviewActions,
    useReviewData,
    useReviewState,
    visualFrameOf,
} from '@neosidekick/workspace-review-core';

import { isEditingContext, readContextAttributes, resolveReviewContext } from './context';

/**
 * One document-level listener for the whole review, as in CodeQ.WorkspaceReview.
 * Modifier combinations are left to the browser and the keys stay off inside
 * form controls.
 */
export function useReviewShortcuts(): void {
    const actions = useReviewActions();
    const state = useReviewState();
    const { pages, features } = useReviewData();
    const jumpTo = useJumpToPage();

    useEffect(() => {
        function focusChange(pageIndex: number, changeIndex: number) {
            const page = pages[pageIndex];
            if (!page) return;
            const reveal = () => {
                const element = changeElement(pageIndex, changeIndex);
                if (!element) return;
                focusWithoutScroll(element);
                scrollIntoView(element, 'nearest');
            };
            if (state.collapsed[page.id]) {
                actions.setCollapsed(page.id, false);
                // The card only exists after the page has expanded.
                requestAnimationFrame(reveal);
                return;
            }
            reveal();
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
            if (!(event.target instanceof Element)) return;
            if (state.shortcutsOpen) return;

            if (event.key === '?') {
                if (isEditingContext(event.target) && !event.target.closest('[aria-haspopup="dialog"]')) return;
                event.preventDefault();
                actions.setShortcutsOpen(true);
                return;
            }
            if (event.shiftKey || isEditingContext(event.target)) return;
            if (!pages.length) return;

            const context = resolveReviewContext(readContextAttributes(event.target), state.activePageIndex);
            if (context.index === -1) return;
            const focusPage = !context.inSidebar;
            const page = pages[context.index];

            switch (event.key) {
                case 'ArrowDown':
                case 'j':
                    event.preventDefault();
                    jumpTo(context.index + 1, focusPage);
                    return;
                case 'ArrowUp':
                case 'k':
                    event.preventDefault();
                    jumpTo(context.index - 1, focusPage);
                    return;
                case 'Home':
                    event.preventDefault();
                    jumpTo(0, focusPage);
                    return;
                case 'End':
                    event.preventDefault();
                    jumpTo(pages.length - 1, focusPage);
                    return;
                case 'Enter':
                    if (!context.inSidebar) return;
                    event.preventDefault();
                    jumpTo(context.index, true);
                    return;
                case 'Escape':
                    if (context.inSidebar) return;
                    event.preventDefault();
                    if (page) visualFrameOf(page.id)?.clearCursor();
                    focusWithoutScroll(
                        context.change !== -1 ? pageElement(context.index) : sidebarLinkElement(context.index)
                    );
                    return;
                case ']':
                    event.preventDefault();
                    if (state.viewMode === 'visual' && page) visualFrameOf(page.id)?.step(1);
                    else if (context.change + 1 < changeElements(context.index).length) {
                        focusChange(context.index, context.change + 1);
                    }
                    return;
                case '[':
                    event.preventDefault();
                    if (state.viewMode === 'visual' && page) visualFrameOf(page.id)?.step(-1);
                    else if (context.change === 0) jumpTo(context.index, true);
                    else if (context.change > 0) focusChange(context.index, context.change - 1);
                    return;
                case 'v':
                    event.preventDefault();
                    actions.setReviewed(context.index, !(page && state.reviewed[page.id]));
                    return;
                case 'd':
                    if (!features.visualCompare) return;
                    event.preventDefault();
                    actions.setViewMode(state.viewMode === 'visual' ? 'list' : 'visual');
                    if (!context.inSidebar) focusWithoutScroll(pageElement(context.index));
                    return;
                default:
                    return;
            }
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [actions, features.visualCompare, jumpTo, pages, state]);
}
