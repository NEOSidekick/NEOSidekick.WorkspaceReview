import * as React from 'react';
import { Dialog as NeosUiDialog } from '@neos-project/react-ui-components';

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

/**
 * The component library types `theme` and `autoFocus` as required although themr
 * injects the theme; this wrapper hides that and carries the module's theme
 * variables into the dialog, which renders outside the module's own subtree.
 */
export function Dialog(props: DialogProps) {
    const dialogProps = {
        type: 'warn',
        style: 'wide',
        autoFocus: true,
        className: theme.workspaceReviewTheme,
        ...props,
    } as unknown as React.ComponentProps<typeof NeosUiDialog>;
    return <NeosUiDialog {...dialogProps} />;
}
