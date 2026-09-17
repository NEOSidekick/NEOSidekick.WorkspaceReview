import * as React from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import { useIntl, useReviewActions, useReviewData } from '@neosidekick/workspace-review-core';
import type { NodeChange } from '@neosidekick/workspace-review-core';

import styles from './CardActions.module.css';

/**
 * Publish or discard a single element. Both run through the batch form with only
 * this node checked, because the core controller has no single-node action that
 * the module's form could post to (see the architecture §3.1).
 */
export function CardActions({ change }: { change: NodeChange }) {
    const translate = useIntl();
    const actions = useReviewActions();
    const { workspace } = useReviewData();

    return (
        <div className={styles.actions}>
            {workspace.canPublishToBase && (
                <Button
                    style="success"
                    hoverStyle="success"
                    disabled={!change.publishable}
                    title={
                        change.publishable
                            ? translate('actions.publishChange', 'Publish this change')
                            : translate(
                                  'actions.cantPublishInNewPage',
                                  'A single element of a new page cannot be published on its own.'
                              )
                    }
                    onClick={() => actions.runSingleAction(change.contextPath, 'publish')}
                >
                    <Icon icon="check" label={translate('actions.publishChange', 'Publish this change')} />
                </Button>
            )}
            <Button
                style="error"
                hoverStyle="error"
                title={translate('actions.discardChange', 'Discard this change')}
                onClick={() => actions.runSingleAction(change.contextPath, 'discard')}
            >
                <Icon icon="trash-alt" label={translate('actions.discardChange', 'Discard this change')} />
            </Button>
        </div>
    );
}
