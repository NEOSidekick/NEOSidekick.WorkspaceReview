import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon } from '@neos-project/react-ui-components';
import {
    ACTION_FIELD_NAME,
    Dialog,
    DISCARD_FORM_ID,
    NODES_FIELD_NAME,
    POST_HELPER_FORM_ID,
    PUBLISH_FORM_ID,
    countChangedNodes,
    useIntl,
    useReviewActions,
    useReviewData,
    useReviewState,
} from '@neosidekick/workspace-review-core';

import { ActionScopeInfo } from './ActionScopeInfo';

import styles from './PublishingFooter.module.css';
import { discardScope, selectAll } from '../selection';
import { useSelection } from '../useSelection';

type Confirmation = 'none' | 'selected' | 'workspace' | 'shown';

/**
 * The module footer. Every button posts to an inherited core controller action;
 * the buttons are bound to the Fluid forms by id, because the React root is a
 * sibling of both forms.
 */
export function PublishingFooter() {
    const translate = useIntl();
    const { workspace, uris, pages, allPages, isFiltered } = useReviewData();
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
    // A document filter narrows the batch actions to the shown pages. The core
    // publish action would include hidden pages too. Publishing shown changes
    // still requires their new or moved ancestors; discarding does not.
    const shownScope = useMemo(
        () => (isFiltered ? [...selectAll(allPages, pages, true)] : []),
        [isFiltered, allPages, pages],
    );
    const shownContextPaths = useMemo(() => {
        const contextPaths = new Set<string>();
        pages.forEach((page) => page.changes.forEach((change) => contextPaths.add(change.contextPath)));
        return contextPaths;
    }, [pages]);
    // Selected changes of hidden pages have no checkbox that could post them.
    const hiddenSelection = [...selection].filter((contextPath) => !shownContextPaths.has(contextPath));
    const changeCount = isFiltered ? shownScope.length : countChangedNodes(pages);
    const discardContextPaths = useMemo(() => [...discardScope(pages, selection)], [pages, selection]);
    const discardCount = discardContextPaths.length;
    const hasOtherChanges = isFiltered && allPages.length > pages.length;
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
                {hasOtherChanges && (
                    <span className={styles.others}>
                        {translate('filter.otherChanges', 'There are more changes on other pages,')}{' '}
                        <a href={uris.showAll}>{translate('filter.showAll', 'show all')}</a>
                    </span>
                )}
                {/* The buttons act on the selection, or on everything without one.
                    Their labels say so; a selection is counted in front of them. */}
                <ActionScopeInfo />
                <span className={styles.scope} aria-live="polite">
                    {hasSelection &&
                        translate('selection.count', '{0} of {1} changes selected', [selection.size, changeCount])}
                </span>
                {hasSelection && (
                    <button
                        type="button"
                        className={styles.clear}
                        disabled={isPending}
                        onClick={() => toggleAll(false)}
                    >
                        {translate('selection.clear', 'Clear selection')}
                    </button>
                )}
                {hasSelection ? (
                    <>
                        <Button
                            style="error"
                            hoverStyle="error"
                            disabled={isPending || discardCount === 0}
                            onClick={() => setConfirmation('selected')}
                            title={translate('actions.discardSelected', 'Discard selected changes')}
                        >
                            <Icon icon="trash-alt" />
                            {translate('actions.discardSelectedCount', 'Discard {0} selected', [discardCount])}
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
                ) : changeCount === 0 ? null : (
                    <>
                        <Button
                            style="error"
                            hoverStyle="error"
                            disabled={isPending}
                            onClick={() => setConfirmation(isFiltered ? 'shown' : 'workspace')}
                        >
                            <Icon icon="trash-alt" />
                            {discardCount === 1
                                ? translate('actions.discardOne', 'Discard the change')
                                : translate('actions.discardAllCount', 'Discard all {0} changes', [discardCount])}
                        </Button>
                        {workspace.canPublishToBase && (
                            <Button
                                type="submit"
                                style="success"
                                hoverStyle="success"
                                disabled={isPending}
                                {...(isFiltered
                                    ? { form: PUBLISH_FORM_ID, name: ACTION_FIELD_NAME, value: 'publish' }
                                    : { form: POST_HELPER_FORM_ID, formAction: uris.publishWorkspace })}
                            >
                                <Icon icon="check-double" />
                                {changeCount === 1
                                    ? translate('actions.publishOne', 'Publish the change to “{0}”', [
                                          workspace.baseWorkspaceTitle,
                                      ])
                                    : translate('actions.publishAllCount', 'Publish all {0} changes to “{1}”', [
                                          changeCount,
                                          workspace.baseWorkspaceTitle,
                                      ])}
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* What no checkbox posts: without a selection everything a document
                filter shows, with one the selected changes of hidden pages. Not
                while a card posts itself, when the form carries its node alone. */}
            {!singleAction &&
                (hasSelection ? hiddenSelection : shownScope).map((contextPath) => (
                    <input
                        key={contextPath}
                        type="hidden"
                        form={PUBLISH_FORM_ID}
                        name={NODES_FIELD_NAME}
                        value={contextPath}
                    />
                ))}

            {/* A separate form keeps publishing dependencies and checked boxes
                out of the discard payload, including in the visual view. */}
            {!singleAction &&
                discardContextPaths.map((contextPath) => (
                    <input
                        key={contextPath}
                        type="hidden"
                        form={DISCARD_FORM_ID}
                        name={NODES_FIELD_NAME}
                        value={contextPath}
                    />
                ))}

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
                    confirmation === 'selected'
                        ? translate('actions.discardSelected', 'Discard selected changes')
                        : translate('actions.discardAll', 'Discard all changes')
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
                            form={DISCARD_FORM_ID}
                            name={ACTION_FIELD_NAME}
                            value="discard"
                        >
                            <Icon icon="trash-alt" />
                            {confirmation === 'shown'
                                ? translate('actions.discardAll', 'Discard all changes')
                                : translate('actions.discardSelected', 'Discard selected changes')}
                        </Button>
                    ),
                ]}
            >
                {confirmation === 'workspace'
                    ? translate('actions.confirmDiscardAll', 'Really discard every change in “{0}”?', [
                          workspace.title || workspace.name,
                      ])
                    : confirmation === 'shown'
                      ? translate('actions.confirmDiscardShown', 'Really discard all {0} shown changes in “{1}”?', [
                            discardCount,
                            workspace.title || workspace.name,
                        ])
                      : translate('actions.confirmDiscardSelected', 'Really discard the selected changes in “{0}”?', [
                            workspace.title || workspace.name,
                        ])}
            </Dialog>
        </div>
    );
}
