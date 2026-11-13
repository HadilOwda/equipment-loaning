'use client'

import useAmplify from '@/app/hooks/use-amplify';
import { AMPLIFY_DATA_LIST_LIMIT } from '@/app/utils/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import UpdateDialog from '@/components/dialogs/update-dialog';
import { DataSelect } from '@/components/primitives/interactions/data-select';
import TextInputList from '@/components/primitives/interactions/text-input-list';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Equipment } from '../tables/equipment-config';
import { saveEquipmentEdits } from './update-equipment';

interface UpdateEquipmentDialogProps {
    equipment: Equipment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UpdateEquipmentDialog({ equipment, open, onOpenChange }: UpdateEquipmentDialogProps) {
    useAmplify();
    const [equipmentTypeId, setEquipmentTypeId] = useState(equipment.equipmentTypeId);
    const [accessories, setAccessories] = useState<string[]>(equipment.accessories?.filter(a => a != null) ?? []);
    const [notes, setNotes] = useState(equipment.notes ?? '');

    // Start from the saved values every time the dialog opens
    useEffect(() => {
        if (open) {
            setEquipmentTypeId(equipment.equipmentTypeId);
            setAccessories(equipment.accessories?.filter(a => a != null) ?? []);
            setNotes(equipment.notes ?? '');
        }
    }, [open, equipment]);

    const queryEquipmentTypes = async () => {
        const client = generateClient();
        const result = await client.models.EquipmentType.list({
            selectionSet: ['id', 'name'],
            limit: AMPLIFY_DATA_LIST_LIMIT
        });

        if (result.errors)
            handleError(result.errors);

        return result.data.map(equipmentType => ({
            label: equipmentType.name,
            value: equipmentType.id
        }));
    };

    const updateEquipment = async () => {
        const client = generateClient();

        const result = await saveEquipmentEdits({
            id: equipment.id,
            originalEquipmentTypeId: equipment.equipmentTypeId,
            equipmentTypeId,
            accessories,
            notes
        }, {
            getEquipment: (id) => client.models.Equipment.get({ id }, { selectionSet: ['id', 'assignment.id'] }),
            updateEquipment: (input) => client.models.Equipment.update(input)
        });

        if (!result.ok) {
            toast.error(result.message);
            return false;
        }

        return true;
    };

    return (
        <UpdateDialog
            name='Equipment'
            description='The identifier cannot be changed. To fix a mistyped identifier, ask a developer.'
            open={open}
            onOpenChange={onOpenChange}
            onSubmit={updateEquipment}
            canSubmit={equipmentTypeId !== ''}
        >
            <div className='text-sm'>
                <span className='text-muted-foreground'>Physical Identifier: </span>
                <span className='font-mono'>{equipment.id}</span>
            </div>
            <DataSelect
                inputID={`equipment-type-${equipment.id}`}
                label='Equipment Type'
                value={equipmentTypeId}
                queryData={queryEquipmentTypes}
                onChange={setEquipmentTypeId}
            />
            <TextInputList
                inputID={`equipment-accessories-${equipment.id}`}
                label='Accessories'
                isRequired={false}
                onChange={setAccessories}
                addButtonLabel='Add accessory'
                initialValues={equipment.accessories?.filter(a => a != null) ?? []}
            />
            <TextInputWithLabel
                inputID={`equipment-notes-${equipment.id}`}
                label='Notes'
                value={notes}
                onChange={setNotes}
                isRequired={false}
            />
        </UpdateDialog>
    );
}
