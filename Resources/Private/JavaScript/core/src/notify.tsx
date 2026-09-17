import * as React from 'react';
import { createContext, useContext } from 'react';

const NotifyContext = createContext<NeosNotification | null>(null);

/** Console fallback for the rare case that Main.min.js has not created the API. */
const consoleNotification: NeosNotification = {
    notice: (title) => console.info(title),
    error: (title, message) => console.error(title, message ?? ''),
    ok: (title) => console.info(title),
    info: (title) => console.info(title),
    warning: (title, message) => console.warn(title, message ?? ''),
};

export function NotifyProvider({
    notificationApi,
    children,
}: {
    notificationApi: NeosNotification | undefined;
    children: React.ReactNode;
}) {
    return <NotifyContext.Provider value={notificationApi ?? consoleNotification}>{children}</NotifyContext.Provider>;
}

export function useNotify(): NeosNotification {
    return useContext(NotifyContext) ?? consoleNotification;
}
