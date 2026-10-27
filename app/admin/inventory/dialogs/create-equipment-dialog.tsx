'use client'

import useAmplify from '@/app/hooks/use-amplify';
import { AMPLIFY_DATA_LIST_LIMIT, AMPLIFY_ERR_DDB_CONDITION_CHECK_FAILED } from '@/app/utils/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import CreateDialog from '@/components/dialogs/create-dialog'
import { DataSelect } from '@/components/primitives/interactions/data-select';
import TextInputList from '@/components/primitives/interactions/text-input-list';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label'
import { useState } from 'react'
import { toast } from 'sonner';

export default function CreateEquipmentDialog() {
    useAmplify();
    const [id, setId] = useState<string>('');
    const [equipmentTypeId, setEquipmentTypeId] = useState<string>('');
    const [accessories, setAccessories] = useState<string[]>([]);  // optional
    const [notes, setNotes] = useState<string>('');  // optional

    const client = generateClient();

    const createEquipment = async () => {
        const result = await client.models.Equipment.create({
            id,
            equipmentTypeId,
            accessories: (accessories.length > 0 ? accessories : null),
            notes: (notes.length > 0 ? notes : null)
        });

        if (result.errors) {
            if (result.errors[0].errorType == AMPLIFY_ERR_DDB_CONDITION_CHECK_FAILED) {
                toast.info('This physical identifier already exists, please choose a unique value');
                return false;
            } else {
                handleError(result.errors);
                return false;
            }
        }

        return true;
    }

    const queryEquipmentTypes = async () => {
        const result = await client.models.EquipmentType.list({
            selectionSet: ['id', 'name'],
            limit: AMPLIFY_DATA_LIST_LIMIT
        });

        if (result.errors)
            handleError(result.errors);

        return result.data.map((equipmentType) => {
            return {
                label: equipmentType.name,
                value: equipmentType.id
            };
        });
    }

    return (
        <CreateDialog
            name='Equipment'
            description={`
                A single piece of equipment that can be loaned out, labeled with a unique identifier.
                Equipment can also be associated with a list of accessories.
            `}
            onSubmit={createEquipment}
            canSubmit={id != '' && equipmentTypeId != ''}
        >
            <TextInputWithLabel
                inputID='equipment-id'
                label='Physical Identifier'
                value={id}
                onChange={setId}
            />
            <DataSelect
                inputID='equipment-equipment-type'
                label='Equipment Type'
                value={equipmentTypeId}
                queryData={queryEquipmentTypes}
                onChange={setEquipmentTypeId}
            />
            <TextInputList
                inputID='equipment-accessories'
                label='Accessories'
                isRequired={false}
                onChange={setAccessories}
                addButtonLabel='Add accessory'
            />
            <TextInputWithLabel
                inputID='equipment-notes'
                label='Notes'
                value={notes}
                onChange={setNotes}
                isRequired={false}
            />
        </CreateDialog>
    )
}