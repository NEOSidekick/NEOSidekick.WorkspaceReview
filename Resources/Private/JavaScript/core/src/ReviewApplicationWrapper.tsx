import * as React from 'react';

import { ErrorBoundary } from './components/ErrorBoundary';
import { IntlProvider } from './intl';
import type { Translate } from './intl';

interface WrapperProps {
    translate: Translate;
    children: React.ReactNode;
}

/** Provider order of the module: errors first, then intl. */
export function ReviewApplicationWrapper({ translate, children }: WrapperProps) {
    return (
        <ErrorBoundary title={translate('review.loadingFailed', 'The changes of this workspace could not be loaded.')}>
            <IntlProvider translate={translate}>
                {children}
            </IntlProvider>
        </ErrorBoundary>
    );
}
