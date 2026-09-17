import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Kbd, revealInScroller, sidebarLinkElement, useIntl, useReviewActions, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';
import { ProgressBar, ProgressCount } from '@neosidekick/workspace-review-review-progress';

import styles from './PageTree.module.css';
import { PageTreeRow } from './PageTreeRow';
import { useCurrentPageTracking } from '../useCurrentPageTracking';

const TITLE_ID = 'neosidekick-review-pages-title';

/**
 * The changed pages in page-tree order, including the unchanged ancestors the
 * server lists so the structure stays readable.
 */
export function PageTree() {
    const translate = useIntl();
    const { treeRows, pages } = useReviewData();
    const { activePageIndex } = useReviewState();
    const actions = useReviewActions();
    const listRef = useRef<HTMLUListElement>(null);

    useCurrentPageTracking(pages.length);

    // Scroll only the index, leaving the review stream and keyboard focus alone.
    useEffect(() => {
        revealInScroller(sidebarLinkElement(activePageIndex), listRef.current);
    }, [activePageIndex]);

    return (
        <nav className={styles.sidebar} aria-labelledby={TITLE_ID}>
            <div className={styles.header}>
                <h2 className={styles.title} id={TITLE_ID}>
                    {translate('navigation.pages', 'Changed pages')}
                </h2>
                <ProgressCount labelledBy={TITLE_ID} />
            </div>
            <ProgressBar labelledBy={TITLE_ID} />
            <ul className={styles.list} ref={listRef}>
                {treeRows.map((row) => (
                    <PageTreeRow key={row.key} row={row} />
                ))}
            </ul>
            <p className={styles.help}>
                <button
                    type="button"
                    className={styles.shortcuts}
                    aria-haspopup="dialog"
                    title={translate('shortcuts.open', 'Show the keyboard shortcuts')}
                    onClick={() => actions.setShortcutsOpen(true)}
                >
                    <Kbd>?</Kbd> {translate('shortcuts.title', 'Keyboard shortcuts')}
                </button>
            </p>
        </nav>
    );
}
