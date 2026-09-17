import { MODE_STORAGE_KEY, STORAGE_PREFIX } from '../constants';
import type { ViewMode } from '../types';

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** The browser storage, or null where it is blocked (private mode, policies). */
export function safeLocalStorage(): StorageLike | null {
    try {
        const storage = window.localStorage;
        const probe = STORAGE_PREFIX + 'probe';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return storage;
    } catch (error) {
        return null;
    }
}

/**
 * The view mode the review starts in. The stored choice only applies while the
 * visual compare is enabled: with the flag off no frame is rendered, so a
 * persisted visual mode would show an empty review with no way back.
 */
export function readViewMode(storage: StorageLike | null, visualCompare: boolean): ViewMode {
    if (!visualCompare) return 'list';
    try {
        return storage?.getItem(MODE_STORAGE_KEY) === 'visual' ? 'visual' : 'list';
    } catch (error) {
        // Blocked storage: the review starts in the change list.
        return 'list';
    }
}
