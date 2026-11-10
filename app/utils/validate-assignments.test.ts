import { describe, expect, test } from '@jest/globals';
import validateAssignments from './validate-assignments';

describe('validateAssignments', () => {
    test('valid batch returns null', () => {
        const result = validateAssignments([
            { equipmentId: 'equipment-1', requestId: 'request-1' },
            { equipmentId: 'equipment-2', requestId: 'request-2' }
        ], ['equipment-3']);

        expect(result).toBeNull();
    });

    test('empty batch returns null', () => {
        expect(validateAssignments([], ['equipment-1'])).toBeNull();
    });

    test('duplicate equipment in batch fails', () => {
        const result = validateAssignments([
            { equipmentId: 'equipment-1', requestId: 'request-1' },
            { equipmentId: 'equipment-1', requestId: 'request-2' }
        ], []);

        expect(result).toContain('equipment-1');
    });

    test('already assigned equipment fails', () => {
        const result = validateAssignments([
            { equipmentId: 'equipment-1', requestId: 'request-1' }
        ], ['equipment-1']);

        expect(result).toContain('equipment-1');
    });
});
