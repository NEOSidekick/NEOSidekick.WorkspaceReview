/**
 * The visual compare finds an element by the node identifier the Fusion marker
 * carries. `NodeChange.id` is built like `ChangedPage.id`, i.e. the identifier
 * with the dimension hash appended, so the identifier is read out of it; an id
 * that is only the identifier passes through unchanged.
 */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function nodeIdentifierOf(id: string): string {
    const match = UUID_PATTERN.exec(id);
    return match ? match[0] : id;
}
