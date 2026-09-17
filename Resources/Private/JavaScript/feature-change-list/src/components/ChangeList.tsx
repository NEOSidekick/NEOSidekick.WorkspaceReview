import * as React from 'react';
import { Icon } from '@neos-project/react-ui-components';
import {
    ReviewHeading,
    SrOnly,
    countChangedNodes,
    elementCountLabel,
    pageCountLabel,
    useIntl,
    useReviewData,
    useReviewState,
} from '@neosidekick/workspace-review-core';
import { SelectAllCheckbox } from '@neosidekick/workspace-review-publishing';
import { Legend, ModeSwitch } from '@neosidekick/workspace-review-visual-compare';

import styles from './ChangeList.module.css';
import { PageSection } from './PageSection';

/** The review stream: the toolbar and one section per changed page. */
export function ChangeList() {
    const translate = useIntl();
    const { pages, allPages, features, workspace, isFiltered, uris } = useReviewData();
    const { viewMode } = useReviewState();

    // What is published where, and how much of it. A dimension variant of a
    // page is a review entry of its own, so it counts as a page of its own.
    const heading = (
        <ReviewHeading>
            {workspace.title || workspace.name}
            <span className={styles.to} aria-hidden="true">
                →
            </span>
            <SrOnly>{translate('review.publishesTo', 'publishes to')}</SrOnly>
            {workspace.baseWorkspaceTitle}
            {' · '}
            {pageCountLabel(translate, pages.length)}
            {' · '}
            {elementCountLabel(translate, countChangedNodes(pages))}
        </ReviewHeading>
    );

    if (!pages.length) {
        return (
            <div className={styles.stream}>
                {heading}
                {isFiltered ? (
                    <p className={styles.notice} role="status">
                        <Icon icon="info-circle" />
                        <span>
                            {translate('filter.noChanges', 'This page has no unpublished changes.')}{' '}
                            {allPages.length > 0 && (
                                <a href={uris.showAll}>
                                    {translate('filter.showAllChanges', 'Show all changes of the workspace')}
                                </a>
                            )}
                        </span>
                    </p>
                ) : (
                    <p className={styles.empty}>
                        {translate('review.noChanges', 'This workspace has no unpublished changes.')}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className={styles.stream}>
            {heading}
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
