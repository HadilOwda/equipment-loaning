'use client'

import UpdateDialog from '@/components/dialogs/update-dialog';
import { useState } from 'react';
import LoanableEquipmentChecklist from '../../components/loanable-equipment-checklist';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import { toast } from 'sonner';

interface UpdateLoanableEquipmentDialogProps {
    periodId: string;
    initialLoanableEquipment: string[];
    assignedEquipmentIds: string[];
}

export default function UpdateLoanableEquipmentDialog({ periodId, initialLoanableEquipment, assignedEquipmentIds }: UpdateLoanableEquipmentDialogProps) {
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(initialLoanableEquipment);

    const onSubmit = async () => {
        const addedEquipmentIds = selectedEquipmentIds.filter(equipmentId => !initialLoanableEquipment.includes(equipmentId));
        const removedEquipmentIds = initialLoanableEquipment.filter(equipmentId => !selectedEquipmentIds.includes(equipmentId));
        const assignedRemovals = removedEquipmentIds.filter(equipmentId => assignedEquipmentIds.includes(equipmentId));
        if (assignedRemovals.length > 0) {
            toast.error(`Cannot remove assigned or checked-out equipment: ${assignedRemovals.join(', ')}.`);
            return false;
        }

        try {
            const client = generateClient();
            // Equipment may have been assigned since this page loaded. Validate
            // every removal before starting any additions or deletions.
            const equipmentResults = await Promise.all(removedEquipmentIds.map(equipmentId =>
                client.models.Equipment.get({ id: equipmentId }, {
                    selectionSet: ['id', 'assignment.id', 'assignment.status']
                })
            ));
            const readErrors = equipmentResults.flatMap(({ errors }) => errors ?? []);
            if (readErrors.length > 0) {
                handleError(readErrors);
                return false;
            }
            if (equipmentResults.some(({ data }) => !data)) {
                toast.error('Unable to verify equipment availability. Reload the page and try again.');
                return false;
            }

            const newlyAssignedRemovals = equipmentResults.flatMap(({ data }) => data?.assignment ? [data.id] : []);
            if (newlyAssignedRemovals.length > 0) {
                toast.error(`Cannot remove assigned or checked-out equipment: ${newlyAssignedRemovals.join(', ')}. Reload the page to see current assignments.`);
                return false;
            }

            const addOperations = addedEquipmentIds.map(equipmentId => {
                return client.models.PeriodEquipment.create({ equipmentId, periodId });
            });
            const removeOperations = removedEquipmentIds.map(equipmentId => {
                return client.models.PeriodEquipment.delete({ equipmentId, periodId });
            });

            const results = await Promise.all(addOperations.concat(removeOperations));
            const writeErrors = results.flatMap(({ errors }) => errors ?? []);
            if (writeErrors.length > 0) {
                handleError(writeErrors);
                return false;
            }
            return true;
        } catch (error) {
            handleError(error);
            return false;
        }
    };

    return (
        <UpdateDialog
            canSubmit={true}
            onSubmit={onSubmit}
            name='Loanable Equipment'
        >
            <LoanableEquipmentChecklist
                value={selectedEquipmentIds}
                onChange={setSelectedEquipmentIds}
                assignedEquipmentIds={assignedEquipmentIds}
            />
        </UpdateDialog>
    );
}
