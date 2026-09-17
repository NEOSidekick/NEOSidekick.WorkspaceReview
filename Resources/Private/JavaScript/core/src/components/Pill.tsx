import * as React from 'react';
import classnames from 'classnames';

import styles from './Pill.module.css';

interface PillProps {
    variant: 'old' | 'new';
    /** Link targets may be long and are allowed to wrap. */
    wrapping?: boolean;
    children: React.ReactNode;
}

/** A before or after value of a property change. */
export function Pill({ variant, wrapping, children }: PillProps) {
    return <span className={classnames(styles.pill, styles[variant], wrapping && styles.wrapping)}>{children}</span>;
}
