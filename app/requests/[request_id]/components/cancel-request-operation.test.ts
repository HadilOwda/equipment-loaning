import { describe, expect, it, jest } from '@jest/globals';
import {
    cancelRequestInDatabase,
    type CancelRequestOperations,
} from './cancel-request-operation';

function makeOperations(
    overrides: Partial<CancelRequestOperations> = {}
): CancelRequestOperations {
    return {
        getRequest: jest.fn(async () => ({
            data: {
                status: null,
                assignmentId: null,
                pastAssignmentId: null,
                equipmentTypeRequests: [
                    { equipmentTypeId: 'equipment-1' },
                    { equipmentTypeId: 'equipment-2' },
                ],
            },
        })),
        deleteEquipmentPreference: jest.fn(async () => ({
            data: { equipmentTypeId: 'deleted' },
        })),
        deleteRequest: jest.fn(async () => ({
            data: { id: 'request-1' },
        })),
        ...overrides,
    };
}

describe('cancelRequestInDatabase', () => {
    it('deletes preferences before deleting the request', async () => {
        const operations = makeOperations();

        await cancelRequestInDatabase('request-1', operations);

        expect(operations.deleteEquipmentPreference)
            .toHaveBeenCalledTimes(2);
        expect(operations.deleteEquipmentPreference)
            .toHaveBeenCalledWith('equipment-1', 'request-1');
        expect(operations.deleteEquipmentPreference)
            .toHaveBeenCalledWith('equipment-2', 'request-1');
        expect(operations.deleteRequest)
            .toHaveBeenCalledWith('request-1');
    });

    it.each([
        ['assigned', { assignmentId: 'headset-1' }],
        ['previously assigned', { pastAssignmentId: 'headset-1' }],
        ['denied', { status: 'DENIED' }],
        ['checked out', { status: 'CHECKED_OUT' }],
    ])('blocks cancellation of a %s request', async (_, changes) => {
        const operations = makeOperations({
            getRequest: jest.fn(async () => ({
                data: {
                    status: null,
                    assignmentId: null,
                    pastAssignmentId: null,
                    equipmentTypeRequests: [],
                    ...changes,
                },
            })),
        });

        await expect(
            cancelRequestInDatabase('request-1', operations)
        ).rejects.toThrow('This request can no longer be canceled.');

        expect(operations.deleteRequest).not.toHaveBeenCalled();
        expect(operations.deleteEquipmentPreference).not.toHaveBeenCalled();
    });

    it('blocks cancellation when the request lookup fails', async () => {
        const operations = makeOperations({
            getRequest: jest.fn(async () => ({
                data: null,
                errors: [{ message: 'Not authorized' }],
            })),
        });

        await expect(
            cancelRequestInDatabase('request-1', operations)
        ).rejects.toThrow('Unable to verify the request.');

        expect(operations.deleteRequest).not.toHaveBeenCalled();
    });

    it('does not delete the request if removing preferences fails', async () => {
        const operations = makeOperations({
            deleteEquipmentPreference: jest.fn(async () => ({
                data: null,
                errors: [{ message: 'Delete failed' }],
            })),
        });

        await expect(
            cancelRequestInDatabase('request-1', operations)
        ).rejects.toThrow('Failed to remove equipment preferences.');

        expect(operations.deleteRequest).not.toHaveBeenCalled();
    });
});
