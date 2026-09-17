import * as React from 'react';

import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
    title: string;
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/**
 * A rendering error must not leave the module blank: the reviewer still needs the
 * publishing footer, which lives in the surrounding Fluid template.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = { error: null };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    public componentDidCatch(error: Error): void {
        console.error('NEOSidekick.WorkspaceReview', error);
    }

    public render(): React.ReactNode {
        if (!this.state.error) return this.props.children;
        return (
            <div className={styles.error} role="alert">
                {this.props.title}
                <p className={styles.message}>{this.state.error.message}</p>
            </div>
        );
    }
}
