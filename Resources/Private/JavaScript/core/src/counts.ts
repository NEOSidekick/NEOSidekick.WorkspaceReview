import type { Translate } from './intl';

/**
 * Counts with their noun, in translated copy for none, one and many. The XLIFF
 * catalogue of the backend has no plural forms on the client, so each case is
 * its own unit.
 */
export function pageCountLabel(translate: Translate, count: number): string {
    if (count === 0) return translate('count.pages.zero', 'no pages');
    if (count === 1) return translate('count.pages.one', '1 page');
    return translate('count.pages.many', '{0} pages', [count]);
}

/** A changed element is a node that can be published or discarded, not a property row. */
export function elementCountLabel(translate: Translate, count: number): string {
    if (count === 0) return translate('count.elements.zero', 'no changed elements');
    if (count === 1) return translate('count.elements.one', '1 changed element');
    return translate('count.elements.many', '{0} changed elements', [count]);
}
