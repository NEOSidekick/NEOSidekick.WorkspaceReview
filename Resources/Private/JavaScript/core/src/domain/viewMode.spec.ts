import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { MODE_STORAGE_KEY } from '../constants';
import { readViewMode } from './viewMode';
import type { StorageLike } from './reviewedMarks';

function storageWith(mode: string | null): StorageLike {
    return {
        getItem: () => mode,
        setItem: () => undefined,
        removeItem: () => undefined,
    };
}

const throwingStorage: StorageLike = {
    getItem() {
        throw new Error('blocked');
    },
    setItem: () => undefined,
    removeItem: () => undefined,
};

describe('initial view mode', () => {
    it('restores the stored mode while the visual compare is enabled', () => {
        strictEqual(readViewMode(storageWith('visual'), true), 'visual');
        strictEqual(readViewMode(storageWith('list'), true), 'list');
        strictEqual(readViewMode(storageWith(null), true), 'list');
        strictEqual(readViewMode(null, true), 'list');
    });

    it('forces the change list when the visual compare is switched off', () => {
        strictEqual(readViewMode(storageWith('visual'), false), 'list');
    });

    it('falls back to the change list when the storage throws', () => {
        strictEqual(readViewMode(throwingStorage, true), 'list');
    });

    it('reads the mode from the documented key', () => {
        strictEqual(MODE_STORAGE_KEY, 'neosidekick-workspace-review:mode');
    });
});
