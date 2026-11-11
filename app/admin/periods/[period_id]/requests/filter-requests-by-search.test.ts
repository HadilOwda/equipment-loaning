import { describe, expect, it } from '@jest/globals';
import filterRequestsBySearch from './filter-requests-by-search';

const requests = [
    { id: '1', owner: 'u1', assignment: { id: 'quest-001' }, pastAssignment: null },
    { id: '2', owner: 'u2', assignment: null, pastAssignment: { id: 'vive-777' } },
    { id: '3', owner: 'u3', assignment: null, pastAssignment: null },
];

const names: { [owner: string]: string } = { u1: 'Ada Lovelace', u2: 'Grace Hopper', u3: 'Alan Turing' };
const getName = (r: { owner?: string | null }) => names[r.owner ?? ''] ?? 'USER NOT FOUND';

describe('filterRequestsBySearch', () => {
    it('returns everything for an empty or blank search', () => {
        expect(filterRequestsBySearch(requests, '', getName)).toHaveLength(3);
        expect(filterRequestsBySearch(requests, '   ', getName)).toHaveLength(3);
    });

    it('matches display names case-insensitively, on first or last name', () => {
        expect(filterRequestsBySearch(requests, 'GRACE', getName).map(r => r.id)).toEqual(['2']);
        expect(filterRequestsBySearch(requests, 'turing', getName).map(r => r.id)).toEqual(['3']);
    });

    it('matches assigned and returned equipment IDs', () => {
        expect(filterRequestsBySearch(requests, 'quest', getName).map(r => r.id)).toEqual(['1']);
        expect(filterRequestsBySearch(requests, 'vive-777', getName).map(r => r.id)).toEqual(['2']);
    });

    it('returns nothing when no request matches', () => {
        expect(filterRequestsBySearch(requests, 'zzz', getName)).toEqual([]);
    });
});
