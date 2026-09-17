import * as React from 'react';
import { Icon } from '@neos-project/react-ui-components';
import { Badge, SrOnly, useIntl, useReviewState } from '@neosidekick/workspace-review-core';

import styles from './StaleBadge.module.css';

/**
 * Shown when the stored signature of a page no longer matches: the page was
 * edited after the review, so its mark was dropped on this load.
 */
export function StaleBadge({ pageId }: { pageId: string }) {
    const translate = useIntl();
    const isStale = useReviewState().stale[pageId] === true;
    if (!isStale) return null;
    const help = translate(
        'review.changedSinceReviewHelp',
        'This page was edited again after you marked it as reviewed. The reviewed mark was therefore removed, so please look through its changes once more.'
    );
    return (
        <span className={styles.stale} tabIndex={0} data-review-help={help}>
            <Badge variant="stale">
                <Icon icon="question-circle" padded="right" />
                {translate('review.changedSinceReview', 'Changed since your review')}
                <SrOnly>. {help}</SrOnly>
            </Badge>
        </span>
    );
}
