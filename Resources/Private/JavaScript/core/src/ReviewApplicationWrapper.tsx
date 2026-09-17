import * as React from 'react';
import { ApolloProvider } from '@apollo/client';
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client';

import { ErrorBoundary } from './components/ErrorBoundary';
import { IntlProvider } from './intl';
import type { Translate } from './intl';
import { NotifyProvider } from './notify';

interface WrapperProps {
    client: ApolloClient<NormalizedCacheObject>;
    translate: Translate;
    notificationApi: NeosNotification | undefined;
    children: React.ReactNode;
}

/** Provider order of the module: errors first, then intl, notifications, data. */
export function ReviewApplicationWrapper({ client, translate, notificationApi, children }: WrapperProps) {
    return (
        <ErrorBoundary title={translate('review.loadingFailed', 'The changes of this workspace could not be loaded.')}>
            <IntlProvider translate={translate}>
                <NotifyProvider notificationApi={notificationApi}>
                    <ApolloProvider client={client}>{children}</ApolloProvider>
                </NotifyProvider>
            </IntlProvider>
        </ErrorBoundary>
    );
}
