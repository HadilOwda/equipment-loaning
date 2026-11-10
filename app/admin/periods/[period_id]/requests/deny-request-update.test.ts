
import { describe, expect, it, jest } from '@jest/globals';
import { RequestStatus } from '../../../../../amplify/data/constants';
import {
    denyRequestInDatabase,
    type DenyRequestUpdateInput,
} from './deny-request-update';

describe('denyRequestInDatabase', () => {
    it('sets status to DENIED and clears assignmentId', async () => {
        const update = jest.fn(async (_input: DenyRequestUpdateInput) => ({
            data: { id: 'request-123' },
            errors: undefined,
        }));

        await denyRequestInDatabase('request-123', update);

        expect(update).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledWith({
            id: 'request-123',
            status: RequestStatus.DENIED,
            assignmentId: null,
        });
    });

    it('returns database errors to the caller', async () => {
        const errors = [{ message: 'Not authorized' }];

        const update = jest.fn(async (_input: DenyRequestUpdateInput) => ({
            data: null,
            errors,
        }));

        const result = await denyRequestInDatabase('request-123', update);

        expect(result.errors).toEqual(errors);
    });

    it('propagates unexpected database failures', async () => {
        const update = jest.fn(async (_input: DenyRequestUpdateInput) => {
            throw new Error('Network failure');
        });

        await expect(
            denyRequestInDatabase('request-123', update)
        ).rejects.toThrow('Network failure');
    });
});
