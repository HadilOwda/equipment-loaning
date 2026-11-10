'use client'

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react';
import UpdateEquipmentTypeDialog from '../dialogs/update-equipment-type-dialog';
import DeleteEquipmentTypeDialog from '../dialogs/delete-equipment-type-dialog';
import type { EquipmentType } from './equipment-type-config';

export default function EquipmentTypeActions({ equipmentType }: { equipmentType: EquipmentType }) {
    const [updateOpen, setUpdateOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className='fit-content'>
                    <MoreHorizontal className='h-4 w-4' />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(equipmentType.id)}
                    >
                        Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setUpdateOpen(true)}>
                        Update
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <UpdateEquipmentTypeDialog
                equipmentType={equipmentType}
                open={updateOpen}
                onOpenChange={setUpdateOpen}
            />
            <DeleteEquipmentTypeDialog
                equipmentType={equipmentType}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </>
    );
}
