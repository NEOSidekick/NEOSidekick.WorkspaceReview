import * as React from 'react';
import { useQuery } from '@apollo/client';
import classnames from 'classnames';
import { Button } from '@neos-project/react-ui-components';
import { ReviewStateProvider, WORKSPACE_QUERY, theme, useIntl } from '@neosidekick/workspace-review-core';
import type { FeatureFlags, ModuleUris, WorkspaceQueryResult } from '@neosidekick/workspace-review-core';

import styles from './App.module.css';
import { App } from './App';

interface ReviewRootProps {
    workspaceName: string;
    features: FeatureFlags;
    uris: ModuleUris;
}

/** Loads the single review query and hands its result to the state provider. */
export function ReviewRoot({ workspaceName, features, uris }: ReviewRootProps) {
    const translate = useIntl();
    const { data, loading, error, refetch } = useQuery<WorkspaceQueryResult>(WORKSPACE_QUERY, {
        variables: { name: workspaceName },
    });

    if (loading) {
        return (
            <div className={classnames(theme.workspaceReviewTheme, styles.state)}>
                {translate('review.loading', 'Loading the changes…')}
            </div>
        );
    }

    if (error || !data?.workspace) {
        return (
            <div className={classnames(theme.workspaceReviewTheme, styles.state, styles.error)} role="alert">
                <p>{translate('review.loadingFailed', 'The changes of this workspace could not be loaded.')}</p>
                <Button style="lighter" onClick={() => refetch()}>
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
