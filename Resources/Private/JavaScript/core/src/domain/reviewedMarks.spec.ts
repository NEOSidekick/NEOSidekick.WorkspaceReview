import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { importLegacyMarks, isReviewed, readMarks, restoreMarks, writeMarks } from './reviewedMarks';
import type { StorageLike } from './reviewedMarks';
import { pageSignature } from './signature';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { entries: Record<string, string> } {
    const entries = { ...initial };
    return {
        entries,
        getItem: (key) => (key in entries ? entries[key] : null),
        setItem: (key, value) => {
            entries[key] = value;
        },
        removeItem: (key) => {
            delete entries[key];
        },
    };
}

function page(id: string, changes: Array<[string, number]>) {
    return {
        id,
        changes: changes.map(([nodePath, lastModified]) => ({ nodePath, lastModified })),
    };
}

describe('reviewed signature', () => {
    it('joins node path and modification time in page order', () => {
        strictEqual(
            pageSignature(page('a', [['/sites/a/main/c1', 17], ['/sites/a/main/c2', 18]]) as never),
            '/sites/a/main/c1@17|/sites/a/main/c2@18'
        );
    });

    it('keeps a mark whose signature still matches and drops the others', () => {
        const pages = [
            page('a', [['/sites/a/main/c1', 17]]),
            page('b', [['/sites/b/main/c1', 20]]),
        ] as never as Parameters<typeof restoreMarks>[1];
        const restored = restoreMarks({ a: '/sites/a/main/c1@17', b: '/sites/b/main/c1@19' }, pages);
        deepStrictEqual(restored.stale, { b: true });
        deepStrictEqual(restored.marks, { a: '/sites/a/main/c1@17' });
        strictEqual(isReviewed(restored.marks, 'a'), true);
        strictEqual(isReviewed(restored.marks, 'b'), false);
    });
});

describe('legacy import', () => {
    it('strips the DOM id prefix, keeps existing marks and deletes the legacy key', () => {
        const storage = memoryStorage({
            'codeq-workspace-review:user-admin': JSON.stringify({
                'review-page-abc-de': 'old-signature',
                'review-page-def-de': 'other-signature',
            }),
            'neosidekick-workspace-review:user-admin': JSON.stringify({ 'abc-de': 'current-signature' }),
        });
        const marks = importLegacyMarks(storage, 'user-admin', readMarks(storage, 'user-admin'));
        deepStrictEqual(marks, { 'abc-de': 'current-signature', 'def-de': 'other-signature' });
        strictEqual(storage.getItem('codeq-workspace-review:user-admin'), null);
    });

    it('does nothing without a legacy entry', () => {
        const storage = memoryStorage();
        deepStrictEqual(importLegacyMarks(storage, 'user-admin', {}), {});
    });

    it('removes the storage entry when the last mark is gone', () => {
        const storage = memoryStorage({ 'neosidekick-workspace-review:user-admin': '{"a":"s"}' });
        writeMarks(storage, 'user-admin', {});
        strictEqual(storage.getItem('neosidekick-workspace-review:user-admin'), null);
    });

    it('ignores unreadable storage content', () => {
        const storage = memoryStorage({ 'neosidekick-workspace-review:user-admin': 'not json' });
        deepStrictEqual(readMarks(storage, 'user-admin'), {});
    });
});
