import * as React from 'react';
import { Button } from '@neos-project/react-ui-components';
import { Dialog, Kbd, useIntl, useReviewActions, useReviewData, useReviewState } from '@neosidekick/workspace-review-core';

import styles from './ShortcutsDialog.module.css';

/** The overview opened with `?` or the sidebar button. */
export function ShortcutsDialog() {
    const translate = useIntl();
    const actions = useReviewActions();
    const { shortcutsOpen } = useReviewState();
    const { features } = useReviewData();
    const close = () => actions.setShortcutsOpen(false);

    return (
        <Dialog
            isOpen={shortcutsOpen}
            type="success"
            style="wide"
            title={translate('shortcuts.title', 'Keyboard shortcuts')}
            onRequestClose={close}
            actions={[
                <Button key="close" style="lighter" onClick={close}>
                    {translate('shortcuts.close', 'Close')}
                </Button>,
            ]}
        >
            <div className={styles.columns}>
                <dl className={styles.group}>
                    <dt className={styles.heading}>{translate('shortcuts.groupPages', 'Pages')}</dt>
                    <dt>
                        <Kbd>↓</Kbd> <Kbd>J</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.nextPage', 'next page')}</dd>
                    <dt>
                        <Kbd>↑</Kbd> <Kbd>K</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.previousPage', 'previous page')}</dd>
                    <dt>
                        <Kbd>Home</Kbd> <Kbd>End</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.firstLastPage', 'first / last page')}</dd>
                    <dt>
                        <Kbd>↵</Kbd>
                    </dt>
                    <dd>{translate('navigation.help.review', 'review page')}</dd>
                    <dt>
                        <Kbd>Esc</Kbd>
                    </dt>
                    <dd>{translate('navigation.help.back', 'back to the list')}</dd>
                </dl>
                <dl className={styles.group}>
                    <dt className={styles.heading}>{translate('shortcuts.groupChanges', 'Changes')}</dt>
                    <dt>
                        <Kbd>]</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.nextChange', 'next change on the page')}</dd>
                    <dt>
                        <Kbd>[</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.previousChange', 'previous change on the page')}</dd>
                    <dt>
                        <Kbd>Esc</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.backToPage', 'back to the page heading')}</dd>
                    {features.visualCompare && (
                        <>
                            <dt className={styles.heading}>{translate('shortcuts.groupReview', 'Review')}</dt>
                            <dt>
                                <Kbd>D</Kbd>
                            </dt>
                            <dd>
                                {translate('shortcuts.toggleMode', 'switch between change list and visual compare')}
                            </dd>
                        </>
                    )}
                    <dt>
                        <Kbd>?</Kbd>
                    </dt>
                    <dd>{translate('shortcuts.help', 'show this overview')}</dd>
                </dl>
            </div>
        </Dialog>
    );
}
