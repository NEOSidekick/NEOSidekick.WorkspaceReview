import * as React from 'react';
import { useEffect, useRef } from 'react';
import classnames from 'classnames';
import { SrOnly } from '@neosidekick/workspace-review-core';

import styles from './Checkbox.module.css';

interface CheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    label: string;
    /** Set on the change checkboxes, which are submitted with the Fluid form. */
    form?: string;
    name?: string;
    value?: string;
    onChange(checked: boolean): void;
    /** Renders the light variant used on a change card. */
    onCard?: boolean;
    /** Shows the label next to the box instead of only to screen readers. */
    visibleLabel?: boolean;
}

/**
 * A native checkbox, because the selection is submitted through the core
 * module's Fluid form; the component library's CheckBox renders no form field.
 */
export function Checkbox({
    checked,
    indeterminate = false,
    disabled = false,
    label,
    form,
    name,
    value,
    onChange,
    onCard = false,
    visibleLabel = false,
}: CheckboxProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = indeterminate && !checked;
    }, [indeterminate, checked]);

    return (
        <label className={classnames(styles.wrapper, onCard && styles.onCard, visibleLabel && styles.withLabel)}>
            <input
                ref={inputRef}
                className={styles.input}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                form={form}
                name={name}
                value={value}
                onChange={(event) => onChange(event.target.checked)}
            />
            {visibleLabel ? <span className={styles.label}>{label}</span> : <SrOnly>{label}</SrOnly>}
        </label>
    );
}
