import * as React from 'react';
import { useIntl, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';
import { SelectAllCheckbox } from '@neosidekick/workspace-review-publishing';
import { Legend, ModeSwitch } from '@neosidekick/workspace-review-visual-compare';

import styles from './ChangeList.module.css';
import { PageSection } from './PageSection';

/** The review stream: the toolbar and one section per changed page. */
export function ChangeList() {
    const translate = useIntl();
    const { pages, features } = useReviewData();
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

    return (
        <div className={styles.stream}>
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
