import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Children, isValidElement, type ReactNode, useState } from 'react';
import { RequestStatus } from '@/amplify/data/constants';
import { toast } from 'sonner';
import handleError from '@/app/utils/handle-error';
import UnassignedRequests from './unassigned-requests';

interface EquipmentResult {
    data: { id: string; assignment: { id: string } | null } | null;
    errors?: { message: string }[];
}

const mockGetEquipment = jest.fn<(input: { id: string }) => Promise<EquipmentResult>>();
const mockUpdate = jest.fn<(input: { id: string; assignmentId: string }) => Promise<{ errors?: { message: string }[] }>>();
const mockRefresh = jest.fn();
const mockSetLoading = jest.fn();
const mockSetAssignments = jest.fn();

jest.mock('react', () => ({
    ...jest.requireActual<typeof import('react')>('react'),
    useState: jest.fn()
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('@/app/utils/generate-client', () => ({
    __esModule: true,
    default: () => ({ models: {
        Equipment: { get: mockGetEquipment },
        Request: { update: mockUpdate }
    } })
}));
jest.mock('@/app/utils/handle-error', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('../components/equipment-select', () => ({ __esModule: true, default: () => null }));
jest.mock('./deny-request-button', () => ({ __esModule: true, default: () => null }));

function findSave(tree: ReactNode): () => Promise<void> {
    const find = (node: ReactNode): (() => Promise<void>) | undefined => {
        if (!isValidElement<{ onClick?: () => Promise<void>; children?: ReactNode }>(node)) return;
        if (node.props.onClick && node.props.children === 'Save Assignments') return node.props.onClick;
        for (const child of Children.toArray(node.props.children)) {
            const match = find(child);
            if (match) return match;
        }
    };
    const save = find(tree);
    if (!save) throw new Error('Save Assignments button was not rendered');
    return save;
}

describe('UnassignedRequests integration with current main', () => {
    const assignments = [
        { requestId: 'request-1', equipmentId: 'equipment-1' },
        { requestId: 'request-2', equipmentId: 'equipment-2' }
    ];

    const render = (selected = assignments, denied = false) => UnassignedRequests({
        period: {
            name: 'Test period',
            periodType: 'MATCH',
            loanableEquipment: assignments.map(({ equipmentId }) => ({ equipment: {
                id: equipmentId, equipmentTypeId: 'camera', equipmentType: { name: 'Camera' }, assignment: null
            } })),
            requests: assignments.map(({ requestId }) => ({
                id: requestId, owner: 'student', status: denied ? RequestStatus.DENIED : null,
                assignment: null, pastAssignment: null, equipmentTypeRequests: []
            }))
        },
        newAssignments: selected,
        setNewAssignments: mockSetAssignments,
        userDisplayNames: []
    });

    const expectNoSuccess = () => {
        expect(mockSetAssignments).not.toHaveBeenCalled();
        expect(mockRefresh).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(mockSetLoading).toHaveBeenLastCalledWith(false);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useState).mockReturnValue([false, mockSetLoading]);
        mockGetEquipment.mockImplementation(async ({ id }) => ({ data: { id, assignment: null } }));
        mockUpdate.mockResolvedValue({});
    });

    test('validates and saves, then clears selections and refreshes the page', async () => {
        await findSave(render())();
        expect(mockUpdate).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith({ id: 'request-1', assignmentId: 'equipment-1' });
        expect(mockUpdate).toHaveBeenCalledWith({ id: 'request-2', assignmentId: 'equipment-2' });
        expect(mockSetAssignments).toHaveBeenCalledWith([]);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Assignments updated');
        expect(mockSetLoading).toHaveBeenLastCalledWith(false);
    });

    test('rejects duplicate equipment before any writes or refresh', async () => {
        await findSave(render([
            assignments[0], { requestId: 'request-2', equipmentId: 'equipment-1' }
        ]))();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('more than one request'));
        expectNoSuccess();
    });

    test('rejects duplicate request IDs before any writes or refresh', async () => {
        await findSave(render([
            assignments[0], { requestId: 'request-1', equipmentId: 'equipment-2' }
        ]))();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('more than one equipment assignment'));
        expectNoSuccess();
    });

    test('rejects the whole batch when one equipment became assigned after page load', async () => {
        mockGetEquipment.mockImplementation(async ({ id }) => ({ data: {
            id, assignment: id === 'equipment-2' ? { id: 'another-request' } : null
        } }));
        await findSave(render())();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('equipment-2'));
        expectNoSuccess();
    });

    test('rejects missing equipment before any writes', async () => {
        mockGetEquipment.mockResolvedValue({ data: null });
        await findSave(render())();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('no longer available'));
        expectNoSuccess();
    });

    test('rejects availability read errors without clearing selections', async () => {
        const errors = [{ message: 'Read denied' }];
        mockGetEquipment.mockResolvedValue({ data: null, errors });
        await findSave(render())();
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(handleError).toHaveBeenCalledWith(expect.arrayContaining(errors));
        expectNoSuccess();
    });

    test('retains selections and skips refresh when an update reports errors', async () => {
        const errors = [{ message: 'Update denied' }];
        mockUpdate.mockResolvedValue({ errors });
        await findSave(render())();
        expect(handleError).toHaveBeenCalledWith(errors);
        expectNoSuccess();
    });

    test('recovers loading state when an update throws', async () => {
        const error = new Error('Network failure');
        mockUpdate.mockRejectedValue(error);
        await findSave(render())();
        expect(handleError).toHaveBeenCalledWith(error);
        expectNoSuccess();
    });

    test('keeps denied requests out of the unassigned list', () => {
        const tree = render([], true);
        expect(tree.props.children.props.children).toBe('No unassigned requests');
    });
});
