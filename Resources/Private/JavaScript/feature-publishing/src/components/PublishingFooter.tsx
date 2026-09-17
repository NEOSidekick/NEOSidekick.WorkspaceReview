import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import {
    ACTION_FIELD_NAME,
    Dialog,
    NODES_FIELD_NAME,
    POST_HELPER_FORM_ID,
    PUBLISH_FORM_ID,
    countChangedNodes,
    useIntl,
    useReviewActions,
    useReviewData,
    useReviewState,
} from '@neosidekick/workspace-review-core';

import styles from './PublishingFooter.module.css';
import { useSelection } from '../useSelection';

type Confirmation = 'none' | 'selected' | 'workspace';

/**
 * The module footer. Every button posts to an inherited core controller action;
 * the buttons are bound to the Fluid forms by id, because the React root is a
 * sibling of both forms.
 */
export function PublishingFooter() {
    const translate = useIntl();
    const { workspace, uris, pages } = useReviewData();
    const reviewActions = useReviewActions();
    const { singleAction } = useReviewState();
    const { selection, toggleAll } = useSelection();
    const [confirmation, setConfirmation] = useState<Confirmation>('none');
    const singleActionButton = useRef<HTMLButtonElement>(null);

    // The card actions set the node first and submit afterwards, so the form
    // carries exactly one hidden field while every checkbox is disabled.
    useEffect(() => {
        if (!singleAction) return;
        singleActionButton.current?.click();
        // The submit navigates away. If it did not - an aborted navigation, a
        // blocked submit - the latch would leave the module disabled until a
        // reload, so it is released again.
        const timer = window.setTimeout(() => reviewActions.clearSingleAction(), 15000);
        return () => window.clearTimeout(timer);
    }, [reviewActions, singleAction]);

    const hasSelection = selection.size > 0;
    const changeCount = countChangedNodes(pages);
    // While a card publishes or discards itself, the form carries its node
    // alone; a batch submit would post that single node under another action.
    const isPending = singleAction !== null;

    return (
        <div className={styles.footer}>
            <div className={styles.group}>
                <a className={styles.back} href={uris.index}>
                    {translate('actions.back', 'Back')}
                </a>
            </div>
            <div className={styles.group}>
                {/* The buttons act on the selection, or on everything without one;
                    the line in front of them says which of the two applies. */}
                <span className={styles.scope} aria-live="polite">
                    {hasSelection
                        ? translate('selection.count', '{0} of {1} changes selected', [selection.size, changeCount])
                        : translate('selection.none', 'Nothing selected – the actions apply to all {0} changes', [
                              changeCount,
                          ])}
                </span>
                {hasSelection && (
                    <button type="button" className={styles.clear} disabled={isPending} onClick={() => toggleAll(false)}>
                        {translate('selection.clear', 'Clear selection')}
                    </button>
                )}
                {hasSelection ? (
                    <>
                        <Button
                            style="error"
                            hoverStyle="error"
                            disabled={isPending}
                            onClick={() => setConfirmation('selected')}
                            title={translate('actions.discardSelected', 'Discard selected changes')}
                        >
                            <Icon icon="trash-alt" />
                            {translate('actions.discardSelectedCount', 'Discard {0} selected', [selection.size])}
                        </Button>
                        {workspace.canPublishToBase && (
                            <Button
                                type="submit"
                                style="success"
                                hoverStyle="success"
                                disabled={isPending}
                                form={PUBLISH_FORM_ID}
                                name={ACTION_FIELD_NAME}
                                value="publish"
                            >
                                <Icon icon="check" />
                                {translate('actions.publishSelectedCount', 'Publish {0} selected to “{1}”', [
                                    selection.size,
                                    workspace.baseWorkspaceTitle,
                                ])}
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <Button
                            style="error"
                            hoverStyle="error"
                            disabled={isPending}
                            onClick={() => setConfirmation('workspace')}
                        >
                            <Icon icon="trash-alt" />
                            {translate('actions.discardAllCount', 'Discard all {0} changes', [changeCount])}
                        </Button>
                        {workspace.canPublishToBase && (
                            <Button
                                type="submit"
                                style="success"
                                hoverStyle="success"
                                disabled={isPending}
                                form={POST_HELPER_FORM_ID}
                                formAction={uris.publishWorkspace}
                            >
                                <Icon icon="check-double" />
                                {translate('actions.publishAllCount', 'Publish all {0} changes to “{1}”', [
                                    changeCount,
                                    workspace.baseWorkspaceTitle,
                                ])}
                            </Button>
                        )}
                    </>
                )}
            </div>

            {singleAction && (
                <>
                    <input
                        type="hidden"
                        form={PUBLISH_FORM_ID}
                        name={NODES_FIELD_NAME}
                        value={singleAction.contextPath}
                    />
                    <button
                        ref={singleActionButton}
                        type="submit"
                        hidden
                        form={PUBLISH_FORM_ID}
                        name={ACTION_FIELD_NAME}
                        value={singleAction.action}
                    />
                </>
            )}

            {/* Both confirmations are React dialogs: the Neos backend binds the
                markup modals of Show.html once at page load, before this button
                exists, so its data-toggle convention cannot reach them. */}
            <Dialog
                isOpen={confirmation !== 'none'}
                type="error"
                style="narrow"
                title={
                    confirmation === 'workspace'
                        ? translate('actions.discardAll', 'Discard all changes')
                        : translate('actions.discardSelected', 'Discard selected changes')
                }
                onRequestClose={() => setConfirmation('none')}
                actions={[
                    <Button key="cancel" style="lighter" onClick={() => setConfirmation('none')}>
                        {translate('actions.cancel', 'Cancel')}
                    </Button>,
                    confirmation === 'workspace' ? (
                        <Button
                            key="discard"
                            type="submit"
                            style="error"
                            hoverStyle="error"
                            form={POST_HELPER_FORM_ID}
                            formAction={uris.discardWorkspace}
                        >
                            <Icon icon="trash-alt" />
                            {translate('actions.discardAll', 'Discard all changes')}
                        </Button>
                    ) : (
                        <Button
                            key="discard"
                            type="submit"
                            style="error"
                            hoverStyle="error"
                            form={PUBLISH_FORM_ID}
                            name={ACTION_FIELD_NAME}
                            value="discard"
                        >
                            <Icon icon="trash-alt" />
                            {translate('actions.discardSelected', 'Discard selected changes')}
                        </Button>
                    ),
                ]}
            >
                {confirmation === 'workspace'
                    ? translate('actions.confirmDiscardAll', 'Really discard every change in “{0}”?', [
                          workspace.title || workspace.name,
                      ])
                    : translate('actions.confirmDiscardSelected', 'Really discard the selected changes in “{0}”?', [
                          workspace.title || workspace.name,
                      ])}
            </Dialog>
        </div>
    );
}
