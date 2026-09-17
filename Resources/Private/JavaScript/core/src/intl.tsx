import * as React from 'react';
import { createContext, useContext } from 'react';

export type TranslateArguments = Array<string | number> | Record<string, string | number>;
export type Translate = (id: string, fallback: string, args?: TranslateArguments) => string;

const IntlContext = createContext<Translate | null>(null);

/**
 * Every label goes through the backend's XLIFF catalogue with an English
 * fallback inline, so the module stays readable when a translation is missing.
 * The catalogue itself is Resources/Private/Translations/<language>/Main.xlf.
 */
export function createTranslate(i18n: NeosI18n | undefined): Translate {
    return (id, fallback, args) => {
        if (!i18n) return applyPlaceholders(fallback, args);
        const translated = i18n.translate(id, fallback, 'NEOSidekick.WorkspaceReview', 'Main', args);
        return translated || applyPlaceholders(fallback, args);
    };
}

/** Fills {0}, {1} … in a fallback, which never passes through the XLIFF formatter. */
function applyPlaceholders(fallback: string, args?: TranslateArguments): string {
    if (!args) return fallback;
    const values = Array.isArray(args) ? args : Object.values(args);
    return fallback.replace(/\{(\d+)\}/g, (match, index) => {
        const value = values[Number(index)];
        return value === undefined ? match : String(value);
    });
}

export function IntlProvider({ translate, children }: { translate: Translate; children: React.ReactNode }) {
    return <IntlContext.Provider value={translate}>{children}</IntlContext.Provider>;
}

export function useIntl(): Translate {
    const translate = useContext(IntlContext);
    if (!translate) throw new Error('useIntl must be used inside an IntlProvider');
    return translate;
}
