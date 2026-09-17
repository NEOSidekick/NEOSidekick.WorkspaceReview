declare module '*.module.css' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module '*.css';

interface NeosI18n {
    initialized: boolean;
    translate(
        id: string,
        fallback?: string | null,
        packageKey?: string,
        source?: string,
        args?: Array<string | number> | Record<string, string | number>
    ): string;
}

interface NeosNotification {
    notice(title: string): void;
    error(title: string, message?: string): void;
    ok(title: string): void;
    info(title: string): void;
    warning(title: string, message?: string): void;
}

interface Window {
    NeosCMS?: {
        I18n?: NeosI18n;
        Notification?: NeosNotification;
    };
}
