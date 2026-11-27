import * as React from 'react';
import { render } from 'react-dom';
import {
    POPUP_PRESENTATION,
    ReviewApplicationWrapper,
    closePopup,
    createTranslate,
    moduleIndexUri,
    parseDocumentFilters,
    parseFeatureFlags,
    parsePopupResults,
    reportPopupResults,
    shouldClosePopup,
} from '@neosidekick/workspace-review-core';
import type { ModuleUris } from '@neosidekick/workspace-review-core';

// The two global classes the server emits inside diffHtml; excluded from the
// CSS-modules transformation so their names stay unhashed.
import '@neosidekick/workspace-review-core/src/diff.css';

import { ReviewRoot } from './components/ReviewRoot';
import { loadIconLibrary } from './lib/fontAwesome';

const ROOT_ID = 'workspace-review-app';
/** The close button a popup shows instead of the review once the workspace has no changes. */
const EMPTY_POPUP_ID = 'workspace-review-popup';

/**
 * A popup whose workspace has no changes left renders no review, only its
 * close button. Whatever led here emptied the review: it is reported, and the
 * popup closes. Opened without changes, it stays and waits for the button.
 */
function bootstrapEmptyPopup(): void {
    const button = document.getElementById(EMPTY_POPUP_ID);
    if (!button) return;
    const exitUri = button.dataset.uriExit || '';
    button.addEventListener('click', () => closePopup(exitUri));
    const results = parsePopupResults(button.dataset.popupResults);
    reportPopupResults(results, 0);
    if (shouldClosePopup(results, 0)) closePopup(exitUri);
}

function bootstrap(): void {
    bootstrapEmptyPopup();
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
        showAll: root.dataset.uriShow || '',
        index: moduleIndexUri(window.location.pathname),
        exit: root.dataset.uriExit || '',
    };
    const notify = (message: string) => (notificationApi ? notificationApi.error(message) : console.error(message));

    render(
        <ReviewApplicationWrapper translate={translate}>
            <ReviewRoot
                graphQlUri={root.dataset.graphql || ''}
                workspaceName={workspaceName}
                features={parseFeatureFlags(root.dataset.features)}
                documentFilters={parseDocumentFilters(root.dataset.documents)}
                uris={uris}
                isPopup={root.dataset.presentation === POPUP_PRESENTATION}
                popupResults={parsePopupResults(root.dataset.popupResults)}
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
