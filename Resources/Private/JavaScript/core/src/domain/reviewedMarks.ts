import { LEGACY_ENTRY_PREFIX, LEGACY_STORAGE_PREFIX, STORAGE_PREFIX } from '../constants';
import { pageSignature } from './signature';
import type { ChangedPage } from '../types';

export type MarkStore = Record<string, string>;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export function storageKey(workspaceName: string): string {
    return STORAGE_PREFIX + workspaceName;
}

export function legacyStorageKey(workspaceName: string): string {
    return LEGACY_STORAGE_PREFIX + workspaceName;
}

function readObject(storage: StorageLike | null, key: string): MarkStore {
    if (!storage) return {};
    try {
        const parsed: unknown = JSON.parse(storage.getItem(key) || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const result: MarkStore = {};
        Object.entries(parsed as Record<string, unknown>).forEach(([entryKey, value]) => {
            if (typeof value === 'string') result[entryKey] = value;
        });
        return result;
    } catch (error) {
        // Private mode or blocked storage: the review simply starts without marks.
        return {};
    }
}

export function readMarks(storage: StorageLike | null, workspaceName: string): MarkStore {
    return readObject(storage, storageKey(workspaceName));
}

export function writeMarks(storage: StorageLike | null, workspaceName: string, marks: MarkStore): void {
    if (!storage) return;
    try {
        if (Object.keys(marks).length) storage.setItem(storageKey(workspaceName), JSON.stringify(marks));
        else storage.removeItem(storageKey(workspaceName));
    } catch (error) {
        // Without storage the state lasts for this page view.
    }
}

/**
 * Takes over the marks of CodeQ.WorkspaceReview once. Its entry keys are the DOM
 * ids of the page rows (`review-page-<identifier>-<dimensionHash>`); stripping
 * the prefix yields this package's `ChangedPage.id`. Existing marks win, and the
 * legacy key is removed so the import never runs twice.
 */
export function importLegacyMarks(storage: StorageLike | null, workspaceName: string, marks: MarkStore): MarkStore {
    if (!storage) return marks;
    const legacy = readObject(storage, legacyStorageKey(workspaceName));
    if (!Object.keys(legacy).length) {
        return marks;
    }
    const imported: MarkStore = {};
    Object.entries(legacy).forEach(([entryKey, signature]) => {
        const id = entryKey.startsWith(LEGACY_ENTRY_PREFIX) ? entryKey.slice(LEGACY_ENTRY_PREFIX.length) : entryKey;
        imported[id] = signature;
    });
    const merged = { ...imported, ...marks };
    try {
        storage.removeItem(legacyStorageKey(workspaceName));
    } catch (error) {
        // Nothing to do: a failed removal only repeats a harmless import.
    }
    return merged;
}

export interface RestoredMarks {
    marks: MarkStore;
    stale: Record<string, boolean>;
}

/**
 * Matches the stored signatures against the pages of this load. A page whose
 * signature moved on loses its mark and is flagged instead; holding a mark is
 * what "reviewed" means, so nothing else has to be tracked.
 */
export function restoreMarks(marks: MarkStore, pages: ChangedPage[]): RestoredMarks {
    const nextMarks: MarkStore = { ...marks };
    const stale: Record<string, boolean> = {};
    pages.forEach((page) => {
        if (!(page.id in nextMarks) || nextMarks[page.id] === pageSignature(page)) return;
        delete nextMarks[page.id];
        stale[page.id] = true;
    });
    return { marks: nextMarks, stale };
}

/** A page counts as reviewed exactly while a mark of its own is held. */
export function isReviewed(marks: MarkStore, pageId: string): boolean {
    return marks[pageId] !== undefined;
}

/** Browser storage that throws on access is treated as absent. */
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
