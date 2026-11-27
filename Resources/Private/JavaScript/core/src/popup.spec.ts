import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { POPUP_RESULT_MESSAGE_TYPE, buildPopupResultMessages, parsePopupResults, shouldClosePopup } from './popup';
import type { PopupResult } from './popup';

const result: PopupResult = {
    resultId: 'abc',
    action: 'published',
    workspace: 'user-admin',
    targetWorkspace: 'live',
    changes: [],
};

describe('parsePopupResults', () => {
    it('reads a list of results', () => {
        deepStrictEqual(parsePopupResults(JSON.stringify([result])), [result]);
    });
    it('drops what it cannot read', () => {
        deepStrictEqual(parsePopupResults('not json'), []);
        deepStrictEqual(parsePopupResults('{"resultId":"x"}'), []);
        deepStrictEqual(parsePopupResults(JSON.stringify([{ resultId: 'x', action: 'moved', changes: [] }])), []);
        deepStrictEqual(parsePopupResults(undefined), []);
    });
});

describe('buildPopupResultMessages', () => {
    it('adds what is left in the reviewed pages', () => {
        const [message] = buildPopupResultMessages([result], 2);
        strictEqual(message.type, POPUP_RESULT_MESSAGE_TYPE);
        strictEqual(message.result.remainingInScope, 2);
        strictEqual(message.result.scopeResolved, false);
        strictEqual(buildPopupResultMessages([result], 0)[0].result.scopeResolved, true);
    });
});

describe('shouldClosePopup', () => {
    it('closes only after an action that left nothing to review', () => {
        strictEqual(shouldClosePopup([result], 0), true);
        strictEqual(shouldClosePopup([result], 1), false);
        strictEqual(shouldClosePopup([], 0), false);
    });
});
