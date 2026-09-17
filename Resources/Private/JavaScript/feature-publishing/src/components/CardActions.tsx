import * as React from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import { useIntl, useReviewActions, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';
import type { NodeChange } from '@neosidekick/workspace-review-core';

import styles from './CardActions.module.css';

/**
 * Publish or discard a single element. Both run through the batch form with only
 * this node checked, because the core controller has no single-node action that
 * the module's form could post to (see the architecture §3.1).
 *
 * The buttons are labelled and neutral until hovered: green and red already
 * mean "added" and "deleted" inside a card, and the saturated buttons belong to
 * the batch actions of the footer.
 */
export function CardActions({ change }: { change: NodeChange }) {
    const translate = useIntl();
    const actions = useReviewActions();
    const { workspace } = useReviewData();
    // A second action while the first one is posting would abort its navigation.
    const isPending = useReviewState().singleAction !== null;

    return (
        <div className={styles.actions}>
            {workspace.canPublishToBase && (
                <Button
                    style="lighter"
                    hoverStyle="success"
                    disabled={isPending || !change.publishable}
                    title={
                        change.publishable
                            ? translate('actions.publishChange', 'Publish this change')
                            : translate(
                                  'actions.cantPublishInNewPage',
                                  'A single element of a new page cannot be published on its own.',
                              )
                    }
                    onClick={() => actions.runSingleAction(change.contextPath, 'publish')}
                >
                    <Icon icon="check" />
                    {translate('actions.publish', 'Publish')}
                </Button>
            )}
            <Button
                style="lighter"
                hoverStyle="error"
                disabled={isPending}
                title={translate('actions.discardChange', 'Discard this change')}
                onClick={() => actions.runSingleAction(change.contextPath, 'discard')}
            >
                <Icon icon="trash-alt" />
                {translate('actions.discard', 'Discard')}
            </Button>
        </div>
    );
}
