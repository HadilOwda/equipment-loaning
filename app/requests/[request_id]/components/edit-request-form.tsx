
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label';
import EquipmentTypeList from '../../components/equipment-type-list';

import type { Period } from '../../period-config';
import type { RequestWithDetails } from '../request-details-config';

import { RequestStatus } from '@/amplify/data/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import { saveRequestEdits } from './edit-request-operation';

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
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
        .map((item) => item.equipmentType.id);

    const [collateral, setCollateral] = useState(
        request.collateralDescription
    );

    const [
        selectedEquipmentTypeIds,
        setSelectedEquipmentTypeIds,
    ] = useState<string[]>(initialEquipmentTypeIds);

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleCancelEditing = () => {
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
            new Set(selectedEquipmentTypeIds).size !==
                selectedEquipmentTypeIds.length
        ) {
            toast.error(
                'Please provide collateral and valid equipment preferences.'
            );
            return;
        }

        setIsLoading(true);

        try {
            const client = generateClient();

            // Check the current loaning period before editing.
            const {
                data: currentPeriod,
                errors: periodErrors,
            } = await client.models.Period.get(
                { id: period.id },
                {
                    selectionSet: [
                        'id',
                        'acceptingRequests',
                        'endDateTime',
                    ],
                }
            );

            if (periodErrors?.length) {
                handleError(periodErrors);
                toast.error(
                    'Unable to verify the loaning period.'
                );
                return;
            }

            if (!currentPeriod) {
                toast.error('Loaning period not found.');
                return;
            }

            const endTime = Date.parse(
                currentPeriod.endDateTime
            );

            if (
                currentPeriod.acceptingRequests !== true ||
                !Number.isFinite(endTime) ||
                Date.now() >= endTime
            ) {
                toast.error(
                    'This loaning period is no longer accepting changes.'
                );
                return;
            }

            // Fetch the latest request before making changes.
            const {
                data: currentRequest,
                errors: requestErrors,
            } = await client.models.Request.get(
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

            if (requestErrors?.length) {
                handleError(requestErrors);
                toast.error(
                    'Unable to verify the request.'
                );
                return;
            }

            if (!currentRequest) {
                toast.error('Request not found.');
                return;
            }

            // Assigned, previously assigned, denied, or
            // checked-out requests cannot be edited.
            if (
                currentRequest.assignmentId ||
                currentRequest.pastAssignmentId ||
                currentRequest.status === RequestStatus.DENIED ||
                currentRequest.status === RequestStatus.CHECKED_OUT
            ) {
                toast.error(
                    'This request can no longer be edited.'
                );
                return;
            }

            // Save equipment preferences and collateral
            // through the testable database helper.
            await saveRequestEdits(
                request.id,
                collateral,
                selectedEquipmentTypeIds,
                (
                    currentRequest.equipmentTypeRequests ?? []
                ).map((item) => item.equipmentTypeId),
                {
                    createPreference: (input) =>
                        client.models.EquipmentTypeRequest.create(
                            input
                        ),

                    updatePreference: (input) =>
                        client.models.EquipmentTypeRequest.update(
                            input
                        ),

                    deletePreference: (input) =>
                        client.models.EquipmentTypeRequest.delete(
                            input
                        ),

                    updateRequest: (input) =>
                        client.models.Request.update(input),
                }
            );

            toast.success('Request updated successfully.');
            setIsEditing(false);
            router.refresh();

        } catch (error) {
            handleError(
                error instanceof Error
                    ? error.message
                    : 'Unexpected error updating request.'
            );

            toast.error(
                'Request update failed. Some changes may have saved.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    if (!isEditing) {
        return (
            <Button
                type='button'
                variant='outline'
                onClick={() => setIsEditing(true)}
            >
                Edit Request
            </Button>
        );
    }

    return (
        <div className='flex flex-col gap-6 rounded-lg border p-4'>
            <h2 className='text-lg font-semibold'>
                Edit Request
            </h2>

            <EquipmentTypeList
                period={period}
                selectedEquipmentTypeIds={
                    selectedEquipmentTypeIds
                }
                setSelectedEquipmentTypeIds={
                    setSelectedEquipmentTypeIds
                }
            />

            <TextInputWithLabel
                inputID='edit-request-collateral'
                label='Specify the collateral you intend to provide'
                description='Describe the collateral you will provide when borrowing equipment.'
                value={collateral}
                onChange={setCollateral}
                isRequired={true}
                placeholder='e.g. Stanford ID card'
            />

            <div className='flex gap-3'>
                <Button
                    type='button'
                    onClick={handleSave}
                    disabled={isLoading}
                >
                    {isLoading
                        ? 'Saving...'
                        : 'Save Changes'}
                </Button>

                <Button
                    type='button'
                    variant='outline'
                    onClick={handleCancelEditing}
                    disabled={isLoading}
                >
                    Discard Changes
                </Button>
            </div>
        </div>
    );
}
