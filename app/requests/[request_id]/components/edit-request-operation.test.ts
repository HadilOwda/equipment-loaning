
import { describe, expect, it, jest } from '@jest/globals';

import {
    saveRequestEdits,
    type EditRequestOperations,
} from './edit-request-operation';

function makeOperations(
    overrides: Partial<EditRequestOperations> = {}
): EditRequestOperations {
    return {
        createPreference: jest.fn(async () => ({
            data: { success: true },
        })),

        updatePreference: jest.fn(async () => ({
            data: { success: true },
        })),

        deletePreference: jest.fn(async () => ({
            data: { success: true },
        })),

        updateRequest: jest.fn(async () => ({
            data: { success: true },
        })),

        ...overrides,
    };
}

describe('saveRequestEdits', () => {
    it('updates collateral on an existing request', async () => {
        const operations = makeOperations();

        await saveRequestEdits(
            'request-1',
            '  Stanford ID card  ',
            ['equipment-1'],
            ['equipment-1'],
            operations
        );

        expect(operations.updateRequest).toHaveBeenCalledWith({
            id: 'request-1',
            collateralDescription: 'Stanford ID card',
        });
    });

    it('updates equipment preference rankings', async () => {
        const operations = makeOperations();

        await saveRequestEdits(
            'request-1',
            'Stanford ID',
            ['equipment-2', 'equipment-1'],
            ['equipment-1', 'equipment-2'],
            operations
        );

        expect(operations.updatePreference).toHaveBeenCalledWith({
            equipmentTypeId: 'equipment-2',
            requestId: 'request-1',
            rank: 1,
        });

        expect(operations.updatePreference).toHaveBeenCalledWith({
            equipmentTypeId: 'equipment-1',
            requestId: 'request-1',
            rank: 2,
        });

        expect(operations.createPreference).not.toHaveBeenCalled();
        expect(operations.deletePreference).not.toHaveBeenCalled();
    });

    it('creates newly selected equipment preferences', async () => {
        const operations = makeOperations();

        await saveRequestEdits(
            'request-1',
            'Stanford ID',
            ['equipment-1', 'equipment-2'],
            ['equipment-1'],
            operations
        );

        expect(operations.createPreference).toHaveBeenCalledWith({
            equipmentTypeId: 'equipment-2',
            requestId: 'request-1',
            rank: 2,
        });

        expect(operations.updateRequest).toHaveBeenCalled();
    });

    it('deletes equipment preferences that were removed', async () => {
        const operations = makeOperations();

        await saveRequestEdits(
            'request-1',
            'Stanford ID',
            ['equipment-1'],
            ['equipment-1', 'equipment-2'],
            operations
        );

        expect(operations.deletePreference).toHaveBeenCalledWith({
            equipmentTypeId: 'equipment-2',
            requestId: 'request-1',
        });

        expect(operations.createPreference).not.toHaveBeenCalled();
    });

    it('rejects requests with empty collateral', async () => {
        const operations = makeOperations();

        await expect(
            saveRequestEdits(
                'request-1',
                '   ',
                ['equipment-1'],
                ['equipment-1'],
                operations
            )
        ).rejects.toThrow('Invalid request information.');

        expect(operations.updateRequest).not.toHaveBeenCalled();
    });

    it('rejects duplicate equipment preferences', async () => {
        const operations = makeOperations();

        await expect(
            saveRequestEdits(
                'request-1',
                'Stanford ID',
                ['equipment-1', 'equipment-1'],
                ['equipment-1'],
                operations
            )
        ).rejects.toThrow('Invalid request information.');

        expect(operations.updatePreference).not.toHaveBeenCalled();
    });

    it('stops when an equipment preference update fails', async () => {
        const operations = makeOperations({
            updatePreference: jest.fn(async () => ({
                data: null,
                errors: [{ message: 'Update failed' }],
            })),
        });

        await expect(
            saveRequestEdits(
                'request-1',
                'Stanford ID',
                ['equipment-1'],
                ['equipment-1'],
                operations
            )
        ).rejects.toThrow('Failed to save equipment preferences.');

        expect(operations.updateRequest).not.toHaveBeenCalled();
    });

    it('reports a failed collateral update', async () => {
        const operations = makeOperations({
            updateRequest: jest.fn(async () => ({
                data: null,
                errors: [{ message: 'Not authorized' }],
            })),
        });

        await expect(
            saveRequestEdits(
                'request-1',
                'Stanford ID',
                ['equipment-1'],
                ['equipment-1'],
                operations
            )
        ).rejects.toThrow('Failed to update the request.');
    });
});
