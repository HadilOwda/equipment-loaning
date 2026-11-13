type OperationResult<T> = {
    data?: T | null;
    errors?: readonly unknown[] | null;
};

export interface UpdateEquipmentOperations {
    getEquipment: (id: string) => Promise<OperationResult<{ assignment?: { id: string } | null }>>;
    updateEquipment: (input: {
        id: string;
        equipmentTypeId: string;
        accessories: string[] | null;
        notes: string | null;
    }) => Promise<OperationResult<unknown>>;
}

export interface EquipmentEdits {
    id: string;
    originalEquipmentTypeId: string;
    equipmentTypeId: string;
    accessories: string[];
    notes: string;
}

// `ok: false` means the edit was refused on purpose (nothing was changed). Unexpected
// failures are thrown instead.
export type SaveEquipmentResult = { ok: true } | { ok: false; message: string };

export async function saveEquipmentEdits(edits: EquipmentEdits, operations: UpdateEquipmentOperations): Promise<SaveEquipmentResult> {
    // Changing the type of equipment that is assigned or checked out would change what a
    // student's request and admin Checkout show for it, so that is refused. The page data
    // may be stale, so check the database right now.
    if (edits.equipmentTypeId !== edits.originalEquipmentTypeId) {
        const { data, errors } = await operations.getEquipment(edits.id);
        if (errors?.length || !data) {
            throw new Error('Unable to verify the equipment.');
        }
        if (data.assignment) {
            return {
                ok: false,
                message: 'This equipment is assigned or checked out, so its type cannot be changed. Return it first.'
            };
        }
    }

    const accessories = edits.accessories.map(a => a.trim()).filter(a => a !== '');
    const notes = edits.notes.trim();

    const result = await operations.updateEquipment({
        id: edits.id,
        equipmentTypeId: edits.equipmentTypeId,
        accessories: accessories.length > 0 ? accessories : null,
        notes: notes !== '' ? notes : null
    });

    if (result.errors?.length || !result.data) {
        throw new Error('Failed to update the equipment.');
    }

    return { ok: true };
}
