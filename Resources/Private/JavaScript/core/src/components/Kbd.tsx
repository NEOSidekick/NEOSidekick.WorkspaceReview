import * as React from 'react';

import styles from './Kbd.module.css';

/** A single key in the shortcut overview and in the sidebar hint. */
export function Kbd({ children }: { children: React.ReactNode }) {
    return <kbd className={styles.kbd}>{children}</kbd>;
}
