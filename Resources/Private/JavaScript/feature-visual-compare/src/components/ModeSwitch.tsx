import * as React from 'react';
import { Icon } from '@neos-project/react-ui-components';
import { useIntl, useReviewActions, useReviewState } from '@neosidekick/workspace-review-core';

import styles from './ModeSwitch.module.css';

/** Switches the whole stream between change list and visual compare. */
export function ModeSwitch() {
    const translate = useIntl();
    const actions = useReviewActions();
    const { viewMode } = useReviewState();

    return (
        <div className={styles.modes} role="group" aria-label={translate('mode.label', 'View')}>
            <button
                type="button"
                className={styles.button}
                aria-pressed={viewMode === 'list'}
                title={translate('mode.unifiedHelp', 'Every change as a card with the changed words')}
                onClick={() => actions.setViewMode('list')}
            >
                <Icon icon="list-ul" />
                {translate('mode.unified', 'Change list')}
            </button>
            <button
                type="button"
                className={styles.button}
                aria-pressed={viewMode === 'visual'}
                title={translate('mode.visualHelp', 'The page as it will look, with the changes marked in place')}
                onClick={() => actions.setViewMode('visual')}
            >
                <Icon icon="eye" />
                {translate('mode.visual', 'Visual compare')}
            </button>
        </div>
    );
}
