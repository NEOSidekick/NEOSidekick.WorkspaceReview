import * as React from 'react';
import classnames from 'classnames';
import { useIntl } from '@neosidekick/workspace-review-core';

import styles from './ProgressBar.module.css';
import { useReviewProgress } from '../useReviewProgress';

/** The "2/7 reviewed" counter of the sidebar header. */
export function ProgressCount({ labelledBy }: { labelledBy: string }) {
    const translate = useIntl();
    const { done, total, complete } = useReviewProgress();
    if (!total) return null;
    return (
        <span className={classnames(styles.count, complete && styles.complete)} aria-labelledby={labelledBy}>
            {translate('review.progress', '{0}/{1} reviewed', [done, total])}
        </span>
    );
}

/** The thin bar below the sidebar header. */
export function ProgressBar({ labelledBy }: { labelledBy: string }) {
    const { done, total, ratio } = useReviewProgress();
    if (!total) return null;
    return (
        <div
            className={styles.track}
            role="progressbar"
            aria-labelledby={labelledBy}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
        >
            <div className={styles.bar} style={{ width: `${ratio * 100}%` }} />
        </div>
    );
}
