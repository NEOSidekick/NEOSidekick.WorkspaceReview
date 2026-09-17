/**
 * The visual compare owns the DOM inside its iframes imperatively. The keyboard
 * feature only needs to step through the markers of a page, so each mounted
 * frame registers that handle here instead of being wired through React state.
 */
export interface VisualFrameHandle {
    step(direction: 1 | -1): void;
    clearCursor(): void;
}

const handles = new Map<string, VisualFrameHandle>();

export function registerVisualFrame(pageId: string, handle: VisualFrameHandle): () => void {
    handles.set(pageId, handle);
    return () => {
        if (handles.get(pageId) === handle) handles.delete(pageId);
    };
}

export function visualFrameOf(pageId: string): VisualFrameHandle | undefined {
    return handles.get(pageId);
}
