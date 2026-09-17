import * as React from 'react';
import { render } from 'react-dom';
import {
    ReviewApplicationWrapper,
    createTranslate,
    moduleIndexUri,
    parseFeatureFlags,
} from '@neosidekick/workspace-review-core';
import type { ModuleUris } from '@neosidekick/workspace-review-core';

// The two global classes the server emits inside diffHtml; excluded from the
// CSS-modules transformation so their names stay unhashed.
import '@neosidekick/workspace-review-core/src/diff.css';

import { ReviewRoot } from './components/ReviewRoot';
import { loadIconLibrary } from './lib/fontAwesome';

const ROOT_ID = 'workspace-review-app';

function bootstrap(): void {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    loadIconLibrary();

    const translate = createTranslate(window.NeosCMS?.I18n);
    const notificationApi = window.NeosCMS?.Notification;
    const workspaceName = root.dataset.workspace || '';
    const uris: ModuleUris = {
        rebase: root.dataset.uriRebase || '',
        publishWorkspace: root.dataset.uriPublishWorkspace || '',
        discardWorkspace: root.dataset.uriDiscardWorkspace || '',
        index: moduleIndexUri(window.location.pathname),
    };
    const notify = (message: string) => (notificationApi ? notificationApi.error(message) : console.error(message));

    render(
        <ReviewApplicationWrapper translate={translate}>
            <ReviewRoot
                graphQlUri={root.dataset.graphql || ''}
                workspaceName={workspaceName}
                features={parseFeatureFlags(root.dataset.features)}
                uris={uris}
                notify={notify}
            />
        </ReviewApplicationWrapper>,
        root
    );
}

/**
 * Module bundles are blocking scripts in <head>, so the root element does not
 * exist yet; `window.NeosCMS` is created by Main.min.js at the end of <body>,
 * which may still be pending when DOMContentLoaded fires.
 */
function start(): void {
    if (window.NeosCMS?.I18n?.initialized) {
        bootstrap();
        return;
    }
    window.addEventListener('neoscms-i18n-initialized', bootstrap, { once: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
