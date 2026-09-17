import * as React from 'react';

import { useIntl } from '../intl';
import styles from './ReviewHeading.module.css';

/**
 * The heading of the review stream. It is the only title of the module view,
 * also while the review loads or failed to load, when there is no subtitle yet.
 */
export function ReviewHeading({ children }: { children?: React.ReactNode }) {
    const translate = useIntl();
    return (
        <div className={styles.head}>
            <h1 className={styles.title}>{translate('review.heading', 'Review changes')}</h1>
            {children && <p className={styles.subtitle}>{children}</p>}
        </div>
    );
}
