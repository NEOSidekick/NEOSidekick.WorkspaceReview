import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@neos-project/react-ui-components';
import { ReviewStateProvider, theme, useIntl, useWorkspaceQuery } from '@neosidekick/workspace-review-core';
import type { FeatureFlags, ModuleUris } from '@neosidekick/workspace-review-core';

import styles from './App.module.css';
import { App } from './App';

interface ReviewRootProps {
    graphQlUri: string;
    workspaceName: string;
    features: FeatureFlags;
    uris: ModuleUris;
    notify: (message: string) => void;
}

/** Loads the single review query and hands its result to the state provider. */
export function ReviewRoot({ graphQlUri, workspaceName, features, uris, notify }: ReviewRootProps) {
    const translate = useIntl();
    const { data, loading, failed, refetch } = useWorkspaceQuery(graphQlUri, workspaceName, notify);

    if (loading) {
        return (
            <div className={classnames(theme.workspaceReviewTheme, styles.state)}>
                {translate('review.loading', 'Loading the changes…')}
            </div>
        );
    }

    if (failed || !data) {
        return (
            <div className={classnames(theme.workspaceReviewTheme, styles.state, styles.error)} role="alert">
                <p>{translate('review.loadingFailed', 'The changes of this workspace could not be loaded.')}</p>
                <Button style="lighter" onClick={refetch}>
                    {translate('review.retry', 'Try again')}
                </Button>
            </div>
        );
    }

    return (
        <ReviewStateProvider workspace={data.workspace} features={features} uris={uris}>
            <App />
        </ReviewStateProvider>
    );
}
