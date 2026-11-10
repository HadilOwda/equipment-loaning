
import { RequestStatus } from '../../../../../amplify/data/constants';

export type DenyRequestUpdateInput = {
    id: string;
    status: typeof RequestStatus.DENIED;
    assignmentId: null;
};

export function denyRequestInDatabase<T>(
    requestId: string,
    update: (input: DenyRequestUpdateInput) => Promise<T>
): Promise<T> {
    return update({
        id: requestId,
        status: RequestStatus.DENIED,
        assignmentId: null,
    });
}
