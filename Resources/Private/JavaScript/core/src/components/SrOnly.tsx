import * as React from 'react';

import styles from './SrOnly.module.css';

/** Text that only a screen reader reads, for icon-only controls. */
export function SrOnly({ children }: { children: React.ReactNode }) {
    return <span className={styles.srOnly}>{children}</span>;
}
