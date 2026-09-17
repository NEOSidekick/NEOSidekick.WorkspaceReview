import { ApolloClient, ApolloLink, InMemoryCache, createHttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

/**
 * The review is a single read-only query and every write reloads the page, so the
 * default cache without any type policies is enough.
 */
export function createApolloClient(uri: string, notify: (message: string) => void) {
    const errorLink = onError(({ graphQLErrors, networkError }) => {
        graphQLErrors?.forEach((error) => notify(error.message));
        if (networkError) notify(networkError.message);
    });

    return new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([errorLink, createHttpLink({ uri, credentials: 'same-origin' })]),
    });
}
