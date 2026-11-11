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

    test('non-adjacent duplicate equipment fails', () => {
        expect(validateAssignments([
            { equipmentId: 'equipment-1', requestId: 'request-1' },
            { equipmentId: 'equipment-2', requestId: 'request-2' },
            { equipmentId: 'equipment-1', requestId: 'request-3' }
        ], [])).toMatch(/equipment-1.*more than one request/);
    });

    test('multiple equipment assignments for one request fail', () => {
        expect(validateAssignments([
            { equipmentId: 'equipment-1', requestId: 'request-1' },
            { equipmentId: 'equipment-2', requestId: 'request-1' }
        ], [])).toMatch(/request-1.*more than one equipment assignment/);
    });

    test('an identical assignment repeated in the batch fails', () => {
        const assignment = { equipmentId: 'equipment-1', requestId: 'request-1' };
        expect(validateAssignments([assignment, assignment], [])).not.toBeNull();
    });

    test('accepts readonly inputs without changing them', () => {
        const assignments = Object.freeze([
            Object.freeze({ equipmentId: 'equipment-1', requestId: 'request-1' })
        ]);
        const assignedIds = Object.freeze(['equipment-2']);
        expect(validateAssignments(assignments, assignedIds)).toBeNull();
    });
});
