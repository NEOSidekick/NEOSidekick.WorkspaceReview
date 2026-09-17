import * as React from 'react';
import classnames from 'classnames';
import { STATUS_LABELS, useIntl } from '@neosidekick/workspace-review-core';

import styles from './ModeSwitch.module.css';

/** Explains the marker colours; shown while the visual compare is active. */
export function Legend() {
    const translate = useIntl();
    return (
        <div className={styles.legend}>
            <span className={styles.legendTitle}>{translate('visual.legend', 'Marker colours')}</span>
            {STATUS_LABELS.map((item) => (
                <span className={styles.legendItem} key={item.status}>
                    <i className={classnames(styles.swatch, styles[item.status])} aria-hidden="true" />
                    <span>{translate(item.id, item.fallback)}</span>
                </span>
            ))}
        </div>
    );
}
