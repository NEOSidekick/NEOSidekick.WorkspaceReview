import * as React from 'react';
import { ApolloProvider } from '@apollo/client';
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client';

import { ErrorBoundary } from './components/ErrorBoundary';
import { IntlProvider } from './intl';
import type { Translate } from './intl';

interface WrapperProps {
    client: ApolloClient<NormalizedCacheObject>;
    translate: Translate;
    children: React.ReactNode;
}

/** Provider order of the module: errors first, then intl, then data. */
export function ReviewApplicationWrapper({ client, translate, children }: WrapperProps) {
    return (
        <ErrorBoundary title={translate('review.loadingFailed', 'The changes of this workspace could not be loaded.')}>
            <IntlProvider translate={translate}>
                <ApolloProvider client={client}>{children}</ApolloProvider>
            </IntlProvider>
        </ErrorBoundary>
    );
}
