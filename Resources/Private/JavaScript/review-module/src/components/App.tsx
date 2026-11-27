import * as React from 'react';
import classnames from 'classnames';
import { theme } from '@neosidekick/workspace-review-core';
import type { PopupResult } from '@neosidekick/workspace-review-core';
import { ChangeList } from '@neosidekick/workspace-review-change-list';
import { ShortcutsDialog, useReviewShortcuts } from '@neosidekick/workspace-review-keyboard';
import { PageTree } from '@neosidekick/workspace-review-page-tree';
import { PublishingFooter } from '@neosidekick/workspace-review-publishing';

import styles from './App.module.css';
import { usePopupResults } from './usePopupResults';

/** Sidebar, review stream and the footer with the form-bound buttons. */
export function App({ popupResults }: { popupResults: PopupResult[] }) {
    useReviewShortcuts();
    usePopupResults(popupResults);
    return (
        <div className={classnames(theme.workspaceReviewTheme, styles.layout)}>
            <PageTree />
            <ChangeList />
            <div className={styles.footer}>
                <PublishingFooter />
            </div>
            <ShortcutsDialog />
        </div>
    );
}
