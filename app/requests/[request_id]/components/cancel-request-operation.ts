
import { RequestStatus } from '../../../../amplify/data/constants';

type OperationResult<T> = {
    data?: T | null;
    errors?: readonly unknown[] | null;
};

type RequestToCancel = {
    status?: string | null;
    assignmentId?: string | null;
    pastAssignmentId?: string | null;
    equipmentTypeRequests?: {
        equipmentTypeId: string;
    }[] | null;
};

export interface CancelRequestOperations {
    getRequest: (
        requestId: string
    ) => Promise<OperationResult<RequestToCancel>>;

    deleteEquipmentPreference: (
        equipmentTypeId: string,
        requestId: string
    ) => Promise<OperationResult<unknown>>;

    deleteRequest: (
        requestId: string
    ) => Promise<OperationResult<unknown>>;
}

export async function cancelRequestInDatabase(
    requestId: string,
    operations: CancelRequestOperations
): Promise<void> {
    const { data: request, errors } =
        await operations.getRequest(requestId);

    if (errors?.length || !request) {
        throw new Error('Unable to verify the request.');
    }

    if (
        request.assignmentId ||
        request.pastAssignmentId ||
        request.status === RequestStatus.DENIED ||
        request.status === RequestStatus.CHECKED_OUT
    ) {
        throw new Error('This request can no longer be canceled.');
    }

    for (const item of request.equipmentTypeRequests ?? []) {
        const result = await operations.deleteEquipmentPreference(
            item.equipmentTypeId,
            requestId
        );

        if (result.errors?.length || !result.data) {
            throw new Error('Failed to remove equipment preferences.');
        }
    }

    const result = await operations.deleteRequest(requestId);

    if (result.errors?.length || !result.data) {
        throw new Error('Failed to cancel the request.');
    }
}
