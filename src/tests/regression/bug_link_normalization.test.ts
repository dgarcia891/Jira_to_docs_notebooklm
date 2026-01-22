import { describe, it, expect } from 'vitest';
import { normalizeDoc } from '../../utils/docUtils';

describe('Bug Fix: Link Normalization', () => {
    it('should correctly map docId to id if id is missing', () => {
        const oldDoc = { docId: '123', name: 'Legacy Doc' };
        const normalized = normalizeDoc(oldDoc);

        expect(normalized).toEqual({
            id: '123',
            name: 'Legacy Doc'
        });
    });

    it('should prefer id if both are present', () => {
        const doc = { id: '456', docId: '123', name: 'Mixed Doc' };
        const normalized = normalizeDoc(doc);

        expect(normalized).toEqual({
            id: '456',
            name: 'Mixed Doc'
        });
    });

    it('should return null for null input', () => {
        expect(normalizeDoc(null)).toBeNull();
    });

    it('should maintain existing id and name', () => {
        const doc = { id: '789', name: 'Standard Doc' };
        const normalized = normalizeDoc(doc);

        expect(normalized).toEqual({
            id: '789',
            name: 'Standard Doc'
        });
    });
});
