import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { nodeIdentifierOf } from './nodeIdentifier';

describe('node identifier extraction', () => {
    it('reads the identifier out of an id with a dimension hash', () => {
        strictEqual(
            nodeIdentifierOf('2c8b1f2c-0f9d-4bb5-9f5e-1f7c9c9d4a11-a1b2c3'),
            '2c8b1f2c-0f9d-4bb5-9f5e-1f7c9c9d4a11'
        );
    });

    it('passes a plain identifier through', () => {
        strictEqual(
            nodeIdentifierOf('2c8b1f2c-0f9d-4bb5-9f5e-1f7c9c9d4a11'),
            '2c8b1f2c-0f9d-4bb5-9f5e-1f7c9c9d4a11'
        );
    });

    it('keeps an id that carries no identifier', () => {
        strictEqual(nodeIdentifierOf('change-17'), 'change-17');
    });
});
