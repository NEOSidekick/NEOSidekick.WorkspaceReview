import * as React from 'react';
import classnames from 'classnames';
import { useIntl } from '@neosidekick/workspace-review-core';
import type { ChangeStatus } from '@neosidekick/workspace-review-core';

import styles from './ModeSwitch.module.css';

const ITEMS: Array<{ status: ChangeStatus; id: string; fallback: string }> = [
    { status: 'created', id: 'status.created', fallback: 'created' },
    { status: 'edited', id: 'status.edited', fallback: 'changed' },
    { status: 'moved', id: 'status.moved', fallback: 'moved' },
    { status: 'hidden', id: 'status.hidden', fallback: 'hidden' },
    { status: 'deleted', id: 'status.deleted', fallback: 'deleted' },
];

/** Explains the marker colours; shown while the visual compare is active. */
export function Legend() {
    const translate = useIntl();
    return (
        <div className={styles.legend}>
            <span className={styles.legendTitle}>{translate('visual.legend', 'Marker colours')}</span>
            {ITEMS.map((item) => (
                <span className={styles.legendItem} key={item.status}>
                    <i className={classnames(styles.swatch, styles[item.status])} aria-hidden="true" />
                    <span>{translate(item.id, item.fallback)}</span>
                </span>
            ))}
        </div>
    );
}
