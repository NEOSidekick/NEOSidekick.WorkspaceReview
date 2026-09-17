import { MODE_STORAGE_KEY } from '../constants';
import type { StorageLike } from './reviewedMarks';
import type { ViewMode } from '../types';

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
