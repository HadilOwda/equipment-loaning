'use client'

import useAmplify from '@/app/hooks/use-amplify';
import generateClient from '@/app/utils/generate-client';
import UpdateDialog from '@/components/dialogs/update-dialog';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label';
import type { EquipmentType } from '../tables/equipment-type-config';
import { useEffect, useState } from 'react';

interface UpdateEquipmentTypeDialogProps {
    equipmentType: EquipmentType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UpdateEquipmentTypeDialog({
    equipmentType,
    open,
    onOpenChange
}: UpdateEquipmentTypeDialogProps) {
    useAmplify();
    const [name, setName] = useState(equipmentType.name);

    useEffect(() => {
        if (open) {
            setName(equipmentType.name);
        }
    }, [equipmentType.name, open]);

    const updateEquipmentType = async () => {
        const client = generateClient();
        const result = await client.models.EquipmentType.update({
            id: equipmentType.id,
            name: name.trim()
        });

        if (result.errors) {
            throw new Error(JSON.stringify(result.errors));
        }

        return true;
    };

    return (
        <UpdateDialog
            name='Equipment Type'
            open={open}
            onOpenChange={onOpenChange}
            onSubmit={updateEquipmentType}
            canSubmit={name.trim() !== ''}
        >
            <TextInputWithLabel
                inputID={`equipment-type-name-${equipmentType.id}`}
                label='Name'
                value={name}
                onChange={setName}
            />
        </UpdateDialog>
    );
}
