/**
 * The review as a popup window (module argument `presentation=popup`).
 *
 * Every publishing action is a form post followed by a redirect, so the page
 * that loads afterwards carries what the action did - once, the server keeps
 * it for that page view only. This module hands it to the window that opened
 * the popup and closes the popup once nothing is left to review.
 */

export const POPUP_PRESENTATION = 'popup';

/** The `type` of every message the popup posts to the window that opened it. */
export const POPUP_RESULT_MESSAGE_TYPE = 'workspace-review:result';

/** One published or discarded change, described by the server. */
export interface PopupChange {
    nodeIdentifier: string;
    contextPath: string;
    nodePath: string;
    nodeType: string;
    label: string;
    removed: boolean;
    dimensions: Record<string, string[]>;
    documentIdentifier: string | null;
    documentPath: string | null;
    documentLabel: string | null;
}

/** What one publishing action did, as the server recorded it. */
export interface PopupResult {
    resultId: string;
    action: 'published' | 'discarded';
    workspace: string;
    /** The workspace the changes were published to; null for a discard. */
    targetWorkspace: string | null;
    changes: PopupChange[];
}

export interface PopupResultMessage {
    type: typeof POPUP_RESULT_MESSAGE_TYPE;
    version: 1;
    result: PopupResult & {
        /** The changes still waiting in the reviewed pages after the action. */
        remainingInScope: number;
        /** True once nothing is left to publish or discard in the reviewed pages. */
        scopeResolved: boolean;
    };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads the JSON list of a `data-popup-results` attribute; anything unreadable is dropped. */
export function parsePopupResults(raw: string | null | undefined): PopupResult[] {
    let values: unknown;
    try {
        values = JSON.parse(raw || '[]');
    } catch (error) {
        return [];
    }
    if (!Array.isArray(values)) return [];
    return values.filter(
        (value): value is PopupResult =>
            isRecord(value) &&
            typeof value.resultId === 'string' &&
            (value.action === 'published' || value.action === 'discarded') &&
            Array.isArray(value.changes),
    );
}

export function buildPopupResultMessages(results: PopupResult[], remainingInScope: number): PopupResultMessage[] {
    return results.map((result) => ({
        type: POPUP_RESULT_MESSAGE_TYPE,
        version: 1,
        result: { ...result, remainingInScope, scopeResolved: remainingInScope === 0 },
    }));
}

/** Whether the popup closes by itself: only after an action, never right when it opens. */
export function shouldClosePopup(results: PopupResult[], remainingInScope: number): boolean {
    return results.length > 0 && remainingInScope === 0;
}

/** The window that opened the popup, while it is still open. */
function openerWindow(): Window | null {
    try {
        const opener = window.opener as Window | null;
        return opener && !opener.closed ? opener : null;
    } catch (error) {
        return null;
    }
}

/**
 * Posts the results to the window that opened the popup, restricted to this
 * origin. Without an opener - a link opened in a tab of its own - there is
 * nobody to tell, and nothing happens.
 */
export function reportPopupResults(results: PopupResult[], remainingInScope: number): void {
    const opener = openerWindow();
    if (!opener) return;
    buildPopupResultMessages(results, remainingInScope).forEach((message) => {
        try {
            opener.postMessage(message, window.location.origin);
        } catch (error) {
            // An opener that navigated to another origin receives nothing.
        }
    });
}

/**
 * Closes the popup. A window the browser does not let a script close - one
 * that was not opened as a popup - goes to the review as a module page instead.
 */
export function closePopup(exitUri: string): void {
    window.close();
    window.setTimeout(() => {
        if (!window.closed && exitUri) window.location.href = exitUri;
    }, 300);
}

/**
 * A name for the window that opened the popup, so a form can target it: the
 * editor opens there rather than in the popup. Null without such a window.
 */
export function openerTargetName(): string | null {
    const opener = openerWindow();
    if (!opener) return null;
    try {
        if (!opener.name) opener.name = 'neos-workspace-review-opener';
        return opener.name;
    } catch (error) {
        return null;
    }
}

/** Brings the window that opened the popup to the front, if there is one. */
export function focusOpener(): void {
    openerWindow()?.focus();
}
