import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { useState } from 'react';
import { toast } from 'sonner';
import handleError from '@/app/utils/handle-error';
import UpdateLoanableEquipmentDialog from './update-loanable-equipment-dialog';

interface EquipmentResult {
    data: {
        id: string;
        assignment: { id: string; status: string | null } | null;
        pastAssignment?: { id: string };
    } | null;
    errors?: { message: string }[];
}

const mockGetEquipment = jest.fn<(input: { id: string }) => Promise<EquipmentResult>>();
const mockCreate = jest.fn<(input: { equipmentId: string; periodId: string }) => Promise<{ errors?: { message: string }[] }>>();
const mockDelete = jest.fn<typeof mockCreate>();

jest.mock('react', () => ({
    ...jest.requireActual<typeof import('react')>('react'),
    useState: jest.fn()
}));
jest.mock('@/components/dialogs/update-dialog', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/loanable-equipment-checklist', () => ({ __esModule: true, default: () => null }));
jest.mock('@/app/utils/generate-client', () => ({
    __esModule: true,
    default: () => ({ models: {
        Equipment: { get: mockGetEquipment },
        PeriodEquipment: { create: mockCreate, delete: mockDelete }
    } })
}));
jest.mock('@/app/utils/handle-error', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

describe('UpdateLoanableEquipmentDialog', () => {
    const assigned = 'equipment-assigned';
    const free = 'equipment-free';
    const added = 'equipment-added';
    const initial = [assigned, free];

    const render = (selected: string[], assignedEquipmentIds = [assigned], initialIds = initial) => {
        jest.mocked(useState).mockReturnValue([selected, jest.fn()]);
        return UpdateLoanableEquipmentDialog({
            periodId: 'period-1',
            initialLoanableEquipment: initialIds,
            assignedEquipmentIds
        });
    };

    const expectNoWrites = () => {
        expect(mockCreate).not.toHaveBeenCalled();
        expect(mockDelete).not.toHaveBeenCalled();
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetEquipment.mockImplementation(async ({ id }) => ({ data: { id, assignment: null } }));
        mockCreate.mockResolvedValue({});
        mockDelete.mockResolvedValue({});
    });

    test('passes the protected IDs to the checklist', () => {
        expect(render(initial).props.children.props.assignedEquipmentIds).toEqual([assigned]);
    });

    test('rejects a protected removal even if the selected state bypasses the checklist', async () => {
        const dialog = render([free, added]);
        expect(await dialog.props.onSubmit()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(assigned));
        expect(mockGetEquipment).not.toHaveBeenCalled();
        expectNoWrites();
    });

    test.each([null, 'CHECKED_OUT'])('rejects a new assignment with status %s before any batch writes', async status => {
        mockGetEquipment.mockResolvedValue({ data: { id: free, assignment: { id: 'request-1', status } } });
        const dialog = render([assigned, added]);
        expect(await dialog.props.onSubmit()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(free));
        expectNoWrites();
    });

    test('retains assigned equipment while adding and removing available equipment', async () => {
        const dialog = render([assigned, added]);
        expect(await dialog.props.onSubmit()).toBe(true);
        expect(mockGetEquipment).toHaveBeenCalledTimes(1);
        expect(mockGetEquipment.mock.calls[0][0]).toEqual({ id: free });
        expect(mockCreate).toHaveBeenCalledWith({ equipmentId: added, periodId: 'period-1' });
        expect(mockDelete).toHaveBeenCalledWith({ equipmentId: free, periodId: 'period-1' });
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('allows removing returned equipment with no current assignment', async () => {
        mockGetEquipment.mockResolvedValue({ data: { id: free, assignment: null, pastAssignment: { id: 'returned-request' } } });
        expect(await render([assigned]).props.onSubmit()).toBe(true);
        expect(mockDelete).toHaveBeenCalledWith({ equipmentId: free, periodId: 'period-1' });
    });

    test('allows adding equipment without removing or querying protected equipment', async () => {
        expect(await render([...initial, added]).props.onSubmit()).toBe(true);
        expect(mockCreate).toHaveBeenCalledWith({ equipmentId: added, periodId: 'period-1' });
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockGetEquipment).not.toHaveBeenCalled();
    });

    test('rejects the entire batch when one of several removals becomes assigned', async () => {
        const other = 'equipment-other';
        mockGetEquipment.mockImplementation(async ({ id }) => ({
            data: { id, assignment: id === other ? { id: 'request-2', status: null } : null }
        }));
        expect(await render([added], [], [free, other]).props.onSubmit()).toBe(false);
        expect(mockGetEquipment).toHaveBeenCalledTimes(2);
        expectNoWrites();
    });

    test('fails closed when equipment no longer exists', async () => {
        mockGetEquipment.mockResolvedValue({ data: null });
        expect(await render([assigned, added]).props.onSubmit()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Unable to verify'));
        expectNoWrites();
    });

    test('fails closed when reading availability returns errors', async () => {
        const errors = [{ message: 'Availability read denied' }];
        mockGetEquipment.mockResolvedValue({ data: null, errors });
        expect(await render([assigned, added]).props.onSubmit()).toBe(false);
        expect(handleError).toHaveBeenCalledWith(errors);
        expectNoWrites();
    });

    test('handles a rejected availability request without saving', async () => {
        const error = new Error('Network unavailable');
        mockGetEquipment.mockRejectedValue(error);
        expect(await render([assigned, added]).props.onSubmit()).toBe(false);
        expect(handleError).toHaveBeenCalledWith(error);
        expectNoWrites();
    });

    test.each(['create', 'delete'])('returns failure when the %s operation returns errors', async operation => {
        const errors = [{ message: 'Write denied' }];
        (operation === 'create' ? mockCreate : mockDelete).mockResolvedValue({ errors });
        expect(await render([assigned, added]).props.onSubmit()).toBe(false);
        expect(handleError).toHaveBeenCalledWith(errors);
    });

    test('handles a rejected mutation without reporting success', async () => {
        const error = new Error('Write failed');
        mockDelete.mockRejectedValue(error);
        expect(await render([assigned]).props.onSubmit()).toBe(false);
        expect(handleError).toHaveBeenCalledWith(error);
    });
});
