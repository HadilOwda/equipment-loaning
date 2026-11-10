'use client'

import useAmplify from '@/app/hooks/use-amplify';
import { AMPLIFY_DATA_LIST_LIMIT } from '@/app/utils/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import DeleteDialog from '@/components/dialogs/delete-dialog';
import type { EquipmentType } from '../tables/equipment-type-config';
import { useCallback, useEffect, useState } from 'react';

interface DeleteEquipmentTypeDialogProps {
    equipmentType: EquipmentType;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function DeleteEquipmentTypeDialog({
    equipmentType,
    open,
    onOpenChange
}: DeleteEquipmentTypeDialogProps) {
    useAmplify();
    const [equipmentCount, setEquipmentCount] = useState<number | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [checkFailed, setCheckFailed] = useState(false);

    const getEquipmentCount = useCallback(async () => {
        const client = generateClient();
        let count = 0;
        let nextToken: string | undefined;

        do {
            const result = await client.models.Equipment.list({
                filter: { equipmentTypeId: { eq: equipmentType.id } },
                selectionSet: ['id'],
                limit: AMPLIFY_DATA_LIST_LIMIT,
                nextToken
            });

            if (result.errors) {
                throw new Error(JSON.stringify(result.errors));
            }

            count += result.data.length;
            nextToken = result.nextToken ?? undefined;
        } while (nextToken);

        return count;
    }, [equipmentType.id]);

    useEffect(() => {
        if (!open) {
            return;
        }

        let isCurrent = true;
        setIsChecking(true);
        setCheckFailed(false);
        setEquipmentCount(null);

        getEquipmentCount()
            .then(count => {
                if (isCurrent) {
                    setEquipmentCount(count);
                }
            })
            .catch(error => {
                if (isCurrent) {
                    handleError(error);
                    setCheckFailed(true);
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsChecking(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [getEquipmentCount, open]);

    const deleteEquipmentType = async () => {
        const count = await getEquipmentCount();
        setEquipmentCount(count);
        if (count > 0) {
            return false;
        }

        const client = generateClient();
        const result = await client.models.EquipmentType.delete({ id: equipmentType.id });
        if (result.errors) {
            throw new Error(JSON.stringify(result.errors));
        }

        return true;
    };

    return (
        <DeleteDialog
            name='Equipment Type'
            description={`Are you sure you want to delete "${equipmentType.name}"? This action cannot be undone.`}
            open={open}
            onOpenChange={onOpenChange}
            onSubmit={deleteEquipmentType}
            canSubmit={!isChecking && !checkFailed && equipmentCount === 0}
        >
            {isChecking && <p>Checking equipment references...</p>}
            {!isChecking && checkFailed && (
                <p role='alert'>Equipment references could not be verified. Deletion is disabled.</p>
            )}
            {!isChecking && !checkFailed && equipmentCount !== null && equipmentCount > 0 && (
                <p role='alert'>
                    {equipmentCount} equipment {equipmentCount === 1 ? 'unit' : 'units'} still reference this type.
                </p>
            )}
        </DeleteDialog>
    );
}
