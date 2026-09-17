import * as React from 'react';
import classnames from 'classnames';

import { SrOnly } from './SrOnly';
import styles from './HelpTip.module.css';

/**
 * Wraps a label whose meaning needs more than a few words. The explanation
 * opens below it on hover and on keyboard focus, and is read out after it.
 */
export function HelpTip({
    help,
    className,
    children,
}: {
    help: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <span className={classnames(styles.helpTip, className)} tabIndex={0} data-review-help={help}>
            {children}
            <SrOnly>. {help}</SrOnly>
        </span>
    );
}
