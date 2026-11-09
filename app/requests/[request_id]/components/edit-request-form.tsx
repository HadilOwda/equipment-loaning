
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label';
import EquipmentTypeList from '../../components/equipment-type-list';
import { Period } from '../../period-config';
import { RequestWithDetails } from '../request-details-config';
import { RequestStatus } from '@/amplify/data/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';

interface EditRequestFormProps {
    request: RequestWithDetails;
    period: Period;
}

export default function EditRequestForm({
    request,
    period,
}: EditRequestFormProps) {
    const router = useRouter();

    const initialEquipmentTypeIds = [...request.equipmentTypeRequests]
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
        .map(item => item.equipmentType.id);

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [collateral, setCollateral] = useState(request.collateralDescription);
    const [selectedEquipmentTypeIds, setSelectedEquipmentTypeIds] =
        useState<string[]>(initialEquipmentTypeIds);

    const resetForm = () => {
        setCollateral(request.collateralDescription);
        setSelectedEquipmentTypeIds(initialEquipmentTypeIds);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (isLoading) return;

        if (
            !collateral.trim() ||
            selectedEquipmentTypeIds.length === 0 ||
            selectedEquipmentTypeIds.includes('') ||
            new Set(selectedEquipmentTypeIds).size !== selectedEquipmentTypeIds.length
        ) {
            toast.error('Please complete all fields before saving.');
            return;
        }

        setIsLoading(true);

        try {
            const client = generateClient();

            // Check that the loaning period is still open.
            const { data: currentPeriod, errors: periodErrors } =
                await client.models.Period.get(
                    { id: period.id },
                    {
                        selectionSet: [
                            'id',
                            'acceptingRequests',
                            'endDateTime',
                        ],
                    }
                );

            if (periodErrors?.length || !currentPeriod) {
                toast.error('Unable to verify the loaning period.');
                return;
            }

            const endTime = Date.parse(currentPeriod.endDateTime);

            if (
                !currentPeriod.acceptingRequests ||
                !Number.isFinite(endTime) ||
                Date.now() >= endTime
            ) {
                toast.error('This loaning period is no longer accepting changes.');
                return;
            }

            // Verify the request has not already been assigned or denied.
            const { data: currentRequest, errors: requestErrors } =
                await client.models.Request.get(
                    { id: request.id },
                    {
                        selectionSet: [
                            'id',
                            'status',
                            'assignmentId',
                            'pastAssignmentId',
                            'equipmentTypeRequests.equipmentTypeId',
                            'equipmentTypeRequests.rank',
                        ],
                    }
                );

            if (requestErrors?.length || !currentRequest) {
                toast.error('Unable to verify the request.');
                return;
            }

            if (
                currentRequest.assignmentId ||
                currentRequest.pastAssignmentId ||
                currentRequest.status === RequestStatus.DENIED ||
                currentRequest.status === RequestStatus.CHECKED_OUT
            ) {
                toast.error('This request can no longer be edited.');
                return;
            }

            const existingIds = new Set(
                currentRequest.equipmentTypeRequests.map(
                    item => item.equipmentTypeId
                )
            );

            const selectedIds = new Set(selectedEquipmentTypeIds);

            // Create new equipment preferences and update existing ranks.
            for (const [index, equipmentTypeId] of selectedEquipmentTypeIds.entries()) {
                const input = {
                    equipmentTypeId,
                    requestId: request.id,
                    rank: index + 1,
                };

                const result = existingIds.has(equipmentTypeId)
                    ? await client.models.EquipmentTypeRequest.update(input)
                    : await client.models.EquipmentTypeRequest.create(input);

                if (result.errors?.length || !result.data) {
                    throw new Error('Failed to save equipment preferences.');
                }
            }

            // Remove equipment preferences that the student deleted.
            for (const equipmentTypeId of existingIds) {
                if (!selectedIds.has(equipmentTypeId)) {
                    const result = await client.models.EquipmentTypeRequest.delete({
                        equipmentTypeId,
                        requestId: request.id,
                    });

                    if (result.errors?.length || !result.data) {
                        throw new Error('Failed to remove an equipment preference.');
                    }
                }
            }

            // Save the updated collateral description.
            const { data, errors } = await client.models.Request.update({
                id: request.id,
                collateralDescription: collateral.trim(),
            });

            if (errors?.length || !data) {
                throw new Error('Failed to update the request.');
            }

            toast.success('Request updated successfully.');
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            handleError(
                error instanceof Error
                    ? error.message
                    : 'Unexpected error while updating request.'
            );

            toast.error(
                'Could not complete the update. Some changes may have saved; reload before retrying.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!isEditing) {
        return (
            <Button variant='outline' onClick={() => setIsEditing(true)}>
                Edit Request
            </Button>
        );
    }

    return (
        <div className='flex flex-col gap-4'>
            <h2 className='text-lg font-semibold'>Edit Request</h2>

            <EquipmentTypeList
                period={period}
                selectedEquipmentTypeIds={selectedEquipmentTypeIds}
                setSelectedEquipmentTypeIds={setSelectedEquipmentTypeIds}
            />

            <TextInputWithLabel
                inputID='edit-request-collateral'
                label='Collateral'
                value={collateral}
                onChange={setCollateral}
                isRequired={true}
                placeholder='Describe your collateral'
            />

            <div className='flex gap-2'>
                <Button
                    onClick={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>

                <Button
                    variant='outline'
                    onClick={resetForm}
                    disabled={isLoading}
                >
                    Cancel Editing
                </Button>
            </div>
        </div>
    );
}
