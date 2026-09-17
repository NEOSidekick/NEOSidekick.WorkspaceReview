import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import {
    ACTION_FIELD_NAME,
    Dialog,
    NODES_FIELD_NAME,
    POST_HELPER_FORM_ID,
    PUBLISH_FORM_ID,
    useIntl,
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
    const { workspace, uris } = useReviewData();
    const { singleAction } = useReviewState();
    const { selection } = useSelection();
    const [confirmation, setConfirmation] = useState<Confirmation>('none');
    const singleActionButton = useRef<HTMLButtonElement>(null);

    // The card actions set the node first and submit afterwards, so the form
    // carries exactly one hidden field while every checkbox is disabled.
    useEffect(() => {
        if (singleAction) singleActionButton.current?.click();
    }, [singleAction]);

    const hasSelection = selection.size > 0;

    return (
        <div className={styles.footer}>
            <div className={styles.group}>
                <a className={styles.back} href={uris.index}>
                    {translate('actions.back', 'Back')}
                </a>
            </div>
            <div className={styles.group}>
                {hasSelection && (
                    <span className={styles.count}>
                        {translate('selection.count', '{0} selected', [selection.size])}
                    </span>
                )}
                {hasSelection ? (
                    <>
                        <Button
                            style="error"
                            hoverStyle="error"
                            onClick={() => setConfirmation('selected')}
                            title={translate('actions.discardSelected', 'Discard selected changes')}
                        >
                            <Icon icon="trash-alt" padded="right" />
                            {translate('actions.discardSelected', 'Discard selected changes')}
                        </Button>
                        {workspace.canPublishToBase && (
                            <Button
                                type="submit"
                                style="success"
                                hoverStyle="success"
                                form={PUBLISH_FORM_ID}
                                name={ACTION_FIELD_NAME}
                                value="publish"
                            >
                                <Icon icon="check" padded="right" />
                                {translate('actions.publishSelected', 'Publish selected changes to “{0}”', [
                                    workspace.baseWorkspaceTitle,
                                ])}
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <Button style="error" hoverStyle="error" onClick={() => setConfirmation('workspace')}>
                            <Icon icon="trash-alt" padded="right" />
                            {translate('actions.discardAll', 'Discard all changes')}
                        </Button>
                        {workspace.canPublishToBase && (
                            <Button
                                type="submit"
                                style="success"
                                hoverStyle="success"
                                form={POST_HELPER_FORM_ID}
                                formAction={uris.publishWorkspace}
                            >
                                <Icon icon="check-double" padded="right" />
                                {translate('actions.publishAll', 'Publish all changes to “{0}”', [
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
                            <Icon icon="trash-alt" padded="right" />
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
                            <Icon icon="trash-alt" padded="right" />
                            {translate('actions.discardSelected', 'Discard selected changes')}
                        </Button>
                    ),
                ]}
            >
                {confirmation === 'workspace'
                    ? translate('actions.confirmDiscardAll', 'Really discard every change in this workspace?')
                    : translate('actions.confirmDiscardSelected', 'Really discard the selected changes?')}
            </Dialog>
        </div>
    );
}
