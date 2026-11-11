export interface AssignmentToValidate {
    equipmentId: string;
    requestId: string;
}

/**
 * Validate a batch of request -> equipment assignments before saving.
 * Returns an error message describing the first problem found, or null if the batch is valid.
 *
 * Rejects:
 * - the same equipment appearing more than once in the batch
 * - the same request appearing more than once in the batch
 * - equipment that is already assigned to another request
 */
export default function validateAssignments(
    assignments: readonly AssignmentToValidate[],
    assignedEquipmentIds: readonly string[]
): string | null {
    const seenEquipmentIds = new Set<string>();
    const seenRequestIds = new Set<string>();
    const assignedIds = new Set(assignedEquipmentIds);

    for (const { equipmentId, requestId } of assignments) {
        if (seenEquipmentIds.has(equipmentId)) {
            return `Equipment ${equipmentId} is selected for more than one request`;
        }
        seenEquipmentIds.add(equipmentId);

        if (seenRequestIds.has(requestId)) {
            return `Request ${requestId} has more than one equipment assignment`;
        }
        seenRequestIds.add(requestId);

        if (assignedIds.has(equipmentId)) {
            return `Equipment ${equipmentId} is already assigned to another request`;
        }
    }

    return null;
}
