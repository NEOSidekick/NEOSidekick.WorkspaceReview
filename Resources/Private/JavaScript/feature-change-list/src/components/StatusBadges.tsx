import * as React from 'react';
import { Badge, useIntl } from '@neosidekick/workspace-review-core';
import type { NodeChange } from '@neosidekick/workspace-review-core';

import styles from './ChangeCard.module.css';

/**
 * The statuses are independent – a created element can be hidden at the same
 * time – and use this package's own translations, because the German core
 * targets of `workspaces.legend.*` all read "erstellt".
 */
export function StatusBadges({ change }: { change: NodeChange }) {
    const translate = useIntl();
    if (change.isRemoved) {
        return (
            <span className={styles.badges}>
                <Badge variant="deleted">{translate('status.deleted', 'deleted')}</Badge>
            </span>
        );
    }
    if (!change.isNew && !change.isMoved && !change.isHidden) return null;
    return (
        <span className={styles.badges}>
            {change.isNew && <Badge variant="created">{translate('status.created', 'created')}</Badge>}
            {change.isMoved && <Badge variant="moved">{translate('status.moved', 'moved')}</Badge>}
            {change.isHidden && <Badge variant="hidden">{translate('status.hidden', 'hidden')}</Badge>}
        </span>
    );
}
