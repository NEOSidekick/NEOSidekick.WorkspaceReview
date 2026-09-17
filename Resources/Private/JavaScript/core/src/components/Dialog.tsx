import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Dialog as NeosUiDialog } from '@neos-project/react-ui-components';

import styles from './Dialog.module.css';
import theme from '../Theme.module.css';

interface DialogProps {
    type?: 'success' | 'warn' | 'error';
    style?: 'wide' | 'jumbo' | 'narrow';
    isOpen: boolean;
    title: React.ReactNode;
    children: React.ReactNode;
    onRequestClose: () => void;
    actions: ReadonlyArray<React.ReactNode>;
}

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let dialogCount = 0;

/**
 * The component library types `theme` and `autoFocus` as required although themr
 * injects the theme; this wrapper hides that and carries the module's theme
 * variables into the dialog, which renders outside the module's own subtree.
 *
 * It also makes the dialog behave like one: the library focuses itself when it
 * mounts, so the dialog is mounted on open rather than kept around hidden; the
 * element that had the focus gets it back on close, and Tab cycles inside.
 *
 * This only works while the wrapper itself stays mounted with a controlled
 * `isOpen`: it tracks the element to return the focus to for as long as the
 * dialog is closed. Rendering `{isOpen && <Dialog …/>}` would mount it after
 * the focus has already moved and lose that element.
 */
export function Dialog({ isOpen, title, children, onRequestClose, actions, ...rest }: DialogProps) {
    const bodyRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const titleIdRef = useRef<string>();
    if (!titleIdRef.current) titleIdRef.current = `neosidekick-review-dialog-${++dialogCount}`;

    // The library moves the focus into the dialog before any effect here runs,
    // so the element to return to is tracked while the dialog is closed.
    useEffect(() => {
        if (isOpen) return;
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const remember = (event: FocusEvent) => {
            // The dialog focuses itself while this listener is still attached,
            // and a detached dialog element cannot take the focus back.
            if (event.target instanceof HTMLElement && !event.target.closest('[role="dialog"]')) {
                openerRef.current = event.target;
            }
        };
        document.addEventListener('focusin', remember);
        return () => document.removeEventListener('focusin', remember);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const dialog = bodyRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Tab' || !dialog) return;
            // The library's positioning container is tabbable only to receive
            // the initial focus; it is not a control the cycle should stop at.
            const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (element) => element !== dialog.firstElementChild
            );
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || !focusable.includes(active as HTMLElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        dialog?.addEventListener('keydown', onKeyDown);
        return () => {
            dialog?.removeEventListener('keydown', onKeyDown);
            openerRef.current?.focus({ preventScroll: true });
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const dialogProps = {
        type: 'warn',
        style: 'wide',
        autoFocus: true,
        className: theme.workspaceReviewTheme,
        'aria-modal': 'true',
        'aria-labelledby': titleIdRef.current,
        ...rest,
        isOpen,
        onRequestClose,
        actions,
        title: <span id={titleIdRef.current}>{title}</span>,
        children: (
            <div ref={bodyRef} className={styles.body}>
                {children}
            </div>
        ),
    } as unknown as React.ComponentProps<typeof NeosUiDialog>;
    return <NeosUiDialog {...dialogProps} />;
}
