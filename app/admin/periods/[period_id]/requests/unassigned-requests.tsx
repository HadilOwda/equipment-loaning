'use client'

import EquipmentSelect, { EquipmentSelectItem } from '../components/equipment-select';
import { UserDisplayNames } from '../display-names-config';
import { RequestStatus } from '@/amplify/data/constants';
import DenyRequestButton from './deny-request-button';
import { RequestMatchingItem } from '../components/request-matching-item';
import { PeriodRequests } from './period-requests-config';
import { Assignment } from './requests';
import { Button } from '@/components/ui/button';
import Subtext from '@/components/primitives/text/subtext';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import validateAssignments from '@/app/utils/validate-assignments';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UnassignedRequestsProps {
    period: PeriodRequests;
    newAssignments: Assignment[];
    setNewAssignments: (assignments: Assignment[]) => void;
    userDisplayNames: UserDisplayNames
}

export default function UnassignedRequests({ period, newAssignments, setNewAssignments, userDisplayNames }: UnassignedRequestsProps) {
    const client = generateClient();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Here, unassigned requests denote requests that are unassigned at the time of page load --
    // that is, selecting a value from EquipmentSelect will not move the request to Assigned Requests
const unassignedRequests = period.requests.filter(
    r =>
        !r.assignment &&
        !r.pastAssignment &&
        r.status !== RequestStatus.DENIED
);
    // Create object that maps from equipmentId -> EquipmentSelectItem, then decompose into a list after
    let equipmentSelectItemsObject: { [equipmentId: string]: EquipmentSelectItem } = {};
    period.loanableEquipment.map(({ equipment }) => {
        // Create entry for EquipmentSelectItem `equipments`
        const entry = {
            equipmentId: equipment.id,
            isAvailable: !equipment.assignment && !newAssignments.some(assignment => assignment.equipmentId == equipment.id)
        };

        // If the `equipmentId` already exists in object simply append `entry` to `equipments`; otherwise,
        // add a new `EquipmentSelectItem` to the object
        if (equipmentSelectItemsObject[equipment.equipmentTypeId]) {
            equipmentSelectItemsObject[equipment.equipmentTypeId].equipments.push(entry);
        } else {
            equipmentSelectItemsObject[equipment.equipmentTypeId] = {
                equipmentTypeId: equipment.equipmentTypeId,
                eqiupmentTypeName: equipment.equipmentType.name,
                equipments: [entry]
            };
        }
    });
    const equipmentSelectItems = Object.values(equipmentSelectItemsObject);

    const addNewAssignment = (equipmentId: string, requestId: string) => {
        const existingAssignmentIndex = newAssignments.findIndex(
            assignment => assignment.requestId == requestId
        );
        if (existingAssignmentIndex != -1) {
            let result = [...newAssignments];
            result[existingAssignmentIndex].equipmentId = equipmentId;
            setNewAssignments(result);
        } else {
            setNewAssignments(newAssignments.concat([
                { equipmentId, requestId }
            ]));
        }
    }

    const removeNewAssignment = (requestId: string) => {
        setNewAssignments(newAssignments.filter(a => a.requestId != requestId));
    }

    const saveAssignments = async () => {
        const assignments = newAssignments.map(assignment => ({ ...assignment }));
        setIsLoading(true);
        try {
            // The page's equipment snapshot may be stale. Recheck before any writes.
            const equipmentResults = await Promise.all(assignments.map(({ equipmentId }) =>
                client.models.Equipment.get({ id: equipmentId }, {
                    selectionSet: ['id', 'assignment.id']
                })
            ));
            const equipmentErrors = equipmentResults.flatMap(({ errors }) => errors ?? []);
            if (equipmentErrors.length > 0) {
                handleError(equipmentErrors);
                return;
            }

            if (equipmentResults.some(({ data }) => !data)) {
                toast.error('Selected equipment is no longer available. Reload the page and try again.');
                return;
            }
            const assignedEquipmentIds = equipmentResults.flatMap(({ data }) => data?.assignment ? [data.id] : []);
            const validationError = validateAssignments(assignments, assignedEquipmentIds);
            if (validationError) {
                toast.error(validationError);
                return;
            }

            const results = await Promise.all(assignments.map((assignment) => {
                return client.models.Request.update({
                    id: assignment.requestId,
                    assignmentId: assignment.equipmentId
                });
            }));

            let hasErrors = false;
            results.forEach(({ errors }) => {
                if (errors?.length) {
                    hasErrors = true;
                    handleError(errors);
                }
            });

            if (!hasErrors) {
                setNewAssignments([]);
                toast.success('Assignments updated');
                router.refresh();
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsLoading(false);
        }
    }

    if (unassignedRequests.length == 0) {
        return (
            <div className='text-center'>
                <Subtext>No unassigned requests</Subtext>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-8'>
            <div className='flex flex-col gap-2'>
                {unassignedRequests.map(request => {
                    const equipmentTypeRanks = request.equipmentTypeRequests.reduce<{ [equipmentTypeId: string]: number }>(
                        (result, equipmentTypeRequest) => {
                            if (equipmentTypeRequest.rank) {
                                result[equipmentTypeRequest.equipmentType.id] = equipmentTypeRequest.rank;
                            }
                            return result;
                        },
                        {});
                        const equipmentSelectItemsWithUserRank = equipmentSelectItems.map((equipmentSelectItem) => {
                            return {
                                ...equipmentSelectItem,
                                userRank: equipmentTypeRanks[equipmentSelectItem.equipmentTypeId] ?? undefined
                            };
                        });
                    return (
                        <RequestMatchingItem
                            requestId={request.id}
                            displayName={userDisplayNames.find(u => request.owner == u?.username)?.displayName ?? 'USER NOT FOUND'}
                            key={request.id}
                        >
                            <EquipmentSelect
                                items={equipmentSelectItemsWithUserRank}
                                value={
                                    newAssignments.find(assignment => assignment.requestId == request.id)?.equipmentId || ''
                                }
                                onChange={(equipmentId) => {
                                    addNewAssignment(equipmentId, request.id)
                                }}
                                onClearValue={() => removeNewAssignment(request.id)}
                            />
                                                        
                            <DenyRequestButton
                                requestId={request.id}
                                onDenied={() => removeNewAssignment(request.id)}
                            />
                            
                                                    </RequestMatchingItem>
                    );
                })}
            </div>
            <div className='flex flex-col gap-4'>
                <Alert>
                    <AlertCircleIcon />
                    <AlertTitle>
                        Confirm that request assignments are correct before submitting
                    </AlertTitle>
                    <AlertDescription>
                        Assignments are shared with users when you select Save Assignments.
                        Review your selections before saving.
                    </AlertDescription>
                </Alert>
                <div className='flex flex-col gap-2'>
                    <Button
                        disabled={newAssignments.length == 0 || isLoading}
                        onClick={saveAssignments}
                    >
                        {isLoading ? 'Loading...' : 'Save Assignments'}
                    </Button>
                    <Subtext className='text-center'>
                        Request/equipment matches will only be propagated to users once you select Save Assignments.
                    </Subtext>
                </div>
            </div>
        </div>
    );
}
