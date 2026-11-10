'use client'

import UpdateDialog from '@/components/dialogs/update-dialog';
import { useState } from 'react';
import LoanableEquipmentChecklist from '../../components/loanable-equipment-checklist';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';

export default function UpdateLoanableEquipmentDialog({ periodId, initialLoanableEquipment }: { periodId: string, initialLoanableEquipment: string[] }) {
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(initialLoanableEquipment);

    const onSubmit = async () => {
        const client = generateClient();

        const addedEquipmentIds = selectedEquipmentIds.filter(equipmentId => !initialLoanableEquipment.includes(equipmentId));
        const removedEquipmentIds = initialLoanableEquipment.filter(equipmentId => !selectedEquipmentIds.includes(equipmentId));

        const addOperations = addedEquipmentIds.map(equipmentId => {
            return client.models.PeriodEquipment.create({ equipmentId, periodId })
        });
        const removeOperations = removedEquipmentIds.map(equipmentId => {
            return client.models.PeriodEquipment.delete({ equipmentId, periodId })
        });

        const results = await Promise.all(addOperations.concat(removeOperations));
        let hasErrors = false;
        results.map(result => {
            if (result.errors) {
                handleError(result.errors);
                hasErrors = true;
            }
        });

        return !hasErrors;
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
            />
        </UpdateDialog>
    );
}