import * as React from 'react';

import { useIntl } from '../intl';
import styles from './ReviewHeading.module.css';

const PLACEHOLDER = '\u0000';

/**
 * The heading of the review stream. It is the only title of the module view,
 * also while the review loads or failed to load, when there is no subtitle yet.
 */
export function ReviewHeading({ pageLabel, children }: { pageLabel?: string; children?: React.ReactNode }) {
    const translate = useIntl();
    // A review narrowed to one page names it. The label is set in italics, so
    // the translated sentence is split at the place it gives to the label.
    const [before, after] = translate('review.headingOnPage', 'Review changes on {0}', [PLACEHOLDER]).split(
        PLACEHOLDER,
    );
    return (
        <div className={styles.head}>
            <h1 className={styles.title}>
                {pageLabel ? (
                    <>
                        {before}
                        <i>{pageLabel}</i>
                        {after}
                    </>
                ) : (
                    translate('review.heading', 'Review changes')
                )}
            </h1>
            {children && <p className={styles.subtitle}>{children}</p>}
        </div>
    );
}
