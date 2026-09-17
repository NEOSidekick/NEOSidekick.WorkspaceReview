import * as React from 'react';
import { SrOnly, countChanges, useIntl, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';
import { SelectAllCheckbox } from '@neosidekick/workspace-review-publishing';
import { Legend, ModeSwitch } from '@neosidekick/workspace-review-visual-compare';

import styles from './ChangeList.module.css';
import { PageSection } from './PageSection';

/** The review stream: the toolbar and one section per changed page. */
export function ChangeList() {
    const translate = useIntl();
    const { pages, features, workspace } = useReviewData();
    const { viewMode } = useReviewState();

    if (!pages.length) {
        return (
            <div className={styles.stream}>
                <p className={styles.empty}>
                    {translate('review.noChanges', 'This workspace has no unpublished changes.')}
                </p>
            </div>
        );
    }

    const changeCount = countChanges(pages);

    return (
        <div className={styles.stream}>
            {/* What is published where, and how much of it: the module title
                belongs to the review stream, not to the page tree next to it. */}
            <div className={styles.head}>
                <h1 className={styles.title}>
                    {workspace.title || workspace.name}
                    <span className={styles.to} aria-hidden="true">
                        →
                    </span>
                    <SrOnly>{translate('review.publishesTo', 'publishes to')}</SrOnly>
                    {workspace.baseWorkspaceTitle}
                </h1>
                <p className={styles.counts}>
                    {pages.length === 1
                        ? translate('count.page', '1 page')
                        : translate('count.pages', '{0} pages', [pages.length])}
                    {' · '}
                    {changeCount === 1
                        ? translate('count.change', '1 change')
                        : translate('count.changes', '{0} changes', [changeCount])}
                </p>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.selectAll}>
                    <SelectAllCheckbox />
                </div>
                {features.visualCompare && <ModeSwitch />}
            </div>
            {features.visualCompare && viewMode === 'visual' && <Legend />}
            {pages.map((page, pageIndex) => (
                <PageSection key={page.id} page={page} pageIndex={pageIndex} />
            ))}
        </div>
    );
}
