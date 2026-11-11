
type OperationResult = {
    data?: unknown | null;
    errors?: readonly unknown[] | null;
};

type PreferenceInput = {
    equipmentTypeId: string;
    requestId: string;
    rank: number;
};

type PreferenceIdentifier = {
    equipmentTypeId: string;
    requestId: string;
};

export interface EditRequestOperations {
    createPreference: (
        input: PreferenceInput
    ) => Promise<OperationResult>;

    updatePreference: (
        input: PreferenceInput
    ) => Promise<OperationResult>;

    deletePreference: (
        input: PreferenceIdentifier
    ) => Promise<OperationResult>;

    updateRequest: (
        input: {
            id: string;
            collateralDescription: string;
        }
    ) => Promise<OperationResult>;
}

export async function saveRequestEdits(
    requestId: string,
    collateral: string,
    selectedEquipmentTypeIds: string[],
    existingEquipmentTypeIds: string[],
    operations: EditRequestOperations
): Promise<void> {
    if (
        !collateral.trim() ||
        selectedEquipmentTypeIds.length === 0 ||
        selectedEquipmentTypeIds.includes('') ||
        new Set(selectedEquipmentTypeIds).size !== selectedEquipmentTypeIds.length
    ) {
        throw new Error('Invalid request information.');
    }

    const existingIds = new Set(existingEquipmentTypeIds);
    const selectedIds = new Set(selectedEquipmentTypeIds);

    // Save new preferences and updated rankings.
    for (let index = 0; index < selectedEquipmentTypeIds.length; index++) {
        const equipmentTypeId = selectedEquipmentTypeIds[index];

        const input = {
            equipmentTypeId,
            requestId,
            rank: index + 1,
        };

        const result = existingIds.has(equipmentTypeId)
            ? await operations.updatePreference(input)
            : await operations.createPreference(input);

        if (result.errors?.length || !result.data) {
            throw new Error('Failed to save equipment preferences.');
        }
    }

    // Delete preferences the student removed.
    for (const equipmentTypeId of Array.from(existingIds)) {
        if (!selectedIds.has(equipmentTypeId)) {
            const result = await operations.deletePreference({
                equipmentTypeId,
                requestId,
            });

            if (result.errors?.length || !result.data) {
                throw new Error('Failed to remove an equipment preference.');
            }
        }
    }

    // Update the collateral description.
    const result = await operations.updateRequest({
        id: requestId,
        collateralDescription: collateral.trim(),
    });

    if (result.errors?.length || !result.data) {
        throw new Error('Failed to update the request.');
    }
}
