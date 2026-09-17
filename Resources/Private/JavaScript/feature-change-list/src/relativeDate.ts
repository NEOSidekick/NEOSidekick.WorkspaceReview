const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['week', 7 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
];

/** "3 days ago" for the card header, in the backend's language. */
export function relativeDate(timestamp: number, locale: string, now: number = Date.now()): string {
    const seconds = Math.round(timestamp - now / 1000);
    const absolute = Math.abs(seconds);
    const [unit, size] = UNITS.find(([, unitSize]) => absolute >= unitSize) ?? UNITS[UNITS.length - 1];
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    return formatter.format(Math.round(seconds / size), unit);
}

/** The exact modification time, shown as the title of the relative date. */
export function absoluteDate(timestamp: number, locale: string): string {
    return new Date(timestamp * 1000).toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

let cachedLocale: string | null = null;

/**
 * The language the Neos backend renders in. Its `<html lang>` stays "en"
 * whatever the user's interface language is, so the locale is read from the
 * XLIFF catalogue link the module layout emits (Neos.Neos Module/Index.html),
 * whose "locale" argument is the interface language.
 */
export function backendLocale(): string {
    if (cachedLocale) return cachedLocale;
    const catalogue = document.querySelector<HTMLLinkElement>('link[rel="neos-xliff"]')?.href;
    const match = catalogue ? /[?&]locale=([a-zA-Z_-]+)/.exec(catalogue) : null;
    cachedLocale = match ? match[1].replace(/_/g, '-') : document.documentElement.lang || 'en';
    return cachedLocale;
}
