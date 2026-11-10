'use client'

import useAmplify from '@/app/hooks/use-amplify';
import generateClient from '@/app/utils/generate-client';
import DeleteDialog from '@/components/dialogs/delete-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PeriodWithDetails } from '../period-details-config';

export default function DeletePeriodDialog({ period }: { period: PeriodWithDetails }) {
    useAmplify();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [requestCount, setRequestCount] = useState(period.requests.length);

    const deletePeriod = async () => {
        const client = generateClient();

        // Re-check in case requests were submitted since the page was loaded
        const current = await client.models.Period.get({ id: period.id }, {
            selectionSet: ['requests.id', 'loanableEquipment.equipmentId']
        });
        if (current.errors) {
            throw new Error(JSON.stringify(current.errors));
        }
        if (!current.data) {
            throw new Error(`Period ${period.id} not found`);
        }

        setRequestCount(current.data.requests.length);
        if (current.data.requests.length > 0) {
            return false;
        }

        // Remove loanable equipment links first so no PeriodEquipment rows reference a missing period
        const periodEquipmentResults = await Promise.all(current.data.loanableEquipment.map(({ equipmentId }) =>
            client.models.PeriodEquipment.delete({ equipmentId, periodId: period.id })
        ));
        for (const { errors } of periodEquipmentResults) {
            if (errors) {
                throw new Error(JSON.stringify(errors));
            }
        }

        const result = await client.models.Period.delete({ id: period.id });
        if (result.errors) {
            throw new Error(JSON.stringify(result.errors));
        }

        return true;
    };

    return (
        <>
            <Button variant='secondary' onClick={() => setOpen(true)}>Delete Period</Button>
            <DeleteDialog
                name='Period'
                description={`Are you sure you want to delete "${period.name}"? This action cannot be undone.`}
                open={open}
                onOpenChange={setOpen}
                onSubmit={deletePeriod}
                onSuccess={() => router.push('/admin/periods')}
                canSubmit={requestCount == 0}
            >
                {requestCount > 0 && (
                    <p role='alert'>
                        This period has {requestCount} {requestCount === 1 ? 'request' : 'requests'}, so it cannot be deleted.
                    </p>
                )}
            </DeleteDialog>
        </>
    );
}
