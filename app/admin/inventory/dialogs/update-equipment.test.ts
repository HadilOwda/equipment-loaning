import { describe, expect, it, jest } from '@jest/globals';
import { saveEquipmentEdits, type UpdateEquipmentOperations } from './update-equipment';

const makeOperations = (assignment: { id: string } | null = null): UpdateEquipmentOperations => ({
    getEquipment: jest.fn(async () => ({ data: { assignment } })),
    updateEquipment: jest.fn(async () => ({ data: {} }))
});

const edits = {
    id: 'quest-001',
    originalEquipmentTypeId: 'type-a',
    equipmentTypeId: 'type-a',
    accessories: ['Charger'],
    notes: 'Left strap frayed'
};

describe('saveEquipmentEdits', () => {
    it('saves accessories and notes without checking the database when the type is unchanged', async () => {
        const operations = makeOperations({ id: 'request-1' });
        const result = await saveEquipmentEdits(edits, operations);

        expect(result).toEqual({ ok: true });
        expect(operations.getEquipment).not.toHaveBeenCalled();
        expect(operations.updateEquipment).toHaveBeenCalledWith({
            id: 'quest-001', equipmentTypeId: 'type-a', accessories: ['Charger'], notes: 'Left strap frayed'
        });
    });

    it('changes the type of equipment that is not assigned', async () => {
        const operations = makeOperations(null);
        await saveEquipmentEdits({ ...edits, equipmentTypeId: 'type-b' }, operations);

        expect(operations.getEquipment).toHaveBeenCalledWith('quest-001');
        expect(operations.updateEquipment).toHaveBeenCalledWith(expect.objectContaining({ equipmentTypeId: 'type-b' }));
    });

    it('refuses to change the type of assigned or checked-out equipment', async () => {
        const operations = makeOperations({ id: 'request-1' });

        const result = await saveEquipmentEdits({ ...edits, equipmentTypeId: 'type-b' }, operations);

        expect(result).toEqual({ ok: false, message: expect.stringContaining('cannot be changed') });
        expect(operations.updateEquipment).not.toHaveBeenCalled();
    });

    it('still allows notes and accessories to change on assigned equipment', async () => {
        const operations = makeOperations({ id: 'request-1' });
        await saveEquipmentEdits({ ...edits, notes: 'New note' }, operations);

        expect(operations.updateEquipment).toHaveBeenCalledWith(expect.objectContaining({ notes: 'New note' }));
    });

    it('drops blank accessories and clears empty fields to null', async () => {
        const operations = makeOperations();
        await saveEquipmentEdits({ ...edits, accessories: ['  ', ''], notes: '   ' }, operations);

        expect(operations.updateEquipment).toHaveBeenCalledWith(expect.objectContaining({ accessories: null, notes: null }));
    });

    it('does not change anything when the equipment cannot be verified', async () => {
        const operations: UpdateEquipmentOperations = {
            getEquipment: jest.fn(async () => ({ data: null, errors: [{ message: 'boom' }] })),
            updateEquipment: jest.fn(async () => ({ data: {} }))
        };

        await expect(saveEquipmentEdits({ ...edits, equipmentTypeId: 'type-b' }, operations))
            .rejects.toThrow('Unable to verify the equipment.');
        expect(operations.updateEquipment).not.toHaveBeenCalled();
    });

    it('reports a failed update', async () => {
        const operations = makeOperations();
        (operations.updateEquipment as jest.Mock<UpdateEquipmentOperations['updateEquipment']>)
            .mockResolvedValue({ data: null, errors: [{ message: 'denied' }] });

        await expect(saveEquipmentEdits(edits, operations)).rejects.toThrow('Failed to update the equipment.');
    });
});
