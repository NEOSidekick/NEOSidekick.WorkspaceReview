import * as React from 'react';
import classnames from 'classnames';

import styles from './Badge.module.css';

export type BadgeVariant = 'created' | 'deleted' | 'moved' | 'hidden' | 'stale';

interface BadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
    className?: string;
    title?: string;
}

/** The independent status statements of a change card. */
export function Badge({ variant, children, className, title }: BadgeProps) {
    return (
        <span className={classnames(styles.badge, styles[variant], className)} title={title}>
            {children}
        </span>
    );
}
