import * as React from 'react';

import { WORKSPACE_QUERY } from './query';
import type { WorkspaceQueryResult } from './types';

interface GraphQlResponse {
    data?: WorkspaceQueryResult | null;
    errors?: Array<{ message: string }>;
}

/**
 * Posts the review query to the t3n endpoint. The backend session cookie
 * authenticates the request, so it has to travel with it. A GraphQL error
 * rejects like a transport error, because a partial review is of no use.
 */
export async function fetchWorkspace(uri: string, name: string): Promise<WorkspaceQueryResult> {
    const response = await fetch(uri, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: WORKSPACE_QUERY, variables: { name } }),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const result = (await response.json()) as GraphQlResponse;
    if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(' '));
    if (!result.data?.workspace) throw new Error('The response carries no workspace.');
    return result.data;
}

interface WorkspaceQueryState {
    data: WorkspaceQueryResult | null;
    loading: boolean;
    failed: boolean;
}

/**
 * Loads the review once; every write reloads the page, so there is nothing to
 * keep in sync afterwards. `refetch` serves the retry button only. Failures are
 * reported through `notify`, which the module binds to the Neos notifications.
 */
export function useWorkspaceQuery(uri: string, name: string, notify: (message: string) => void) {
    const [state, setState] = React.useState<WorkspaceQueryState>({ data: null, loading: true, failed: false });
    const [attempt, setAttempt] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        setState((current) => ({ ...current, loading: true, failed: false }));
        fetchWorkspace(uri, name).then(
            (data) => {
                if (!cancelled) setState({ data, loading: false, failed: false });
            },
            (error: Error) => {
                if (cancelled) return;
                notify(error.message);
                setState({ data: null, loading: false, failed: true });
            }
        );
        return () => {
            cancelled = true;
        };
        // `notify` is created once at bootstrap; listing it would refetch on every render of a caller that inlines it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uri, name, attempt]);

    const refetch = React.useCallback(() => setAttempt((current) => current + 1), []);
    return { ...state, refetch };
}
