'use client'

import EquipmentSelect, { EquipmentSelectItem } from '../components/equipment-select';
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
import { toast } from 'sonner';
import { UserDisplayNames } from '../display-names-config';
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

    console.log(period)

    // Here, unassigned requests denote requests that are unassigned at the time of page load --
    // that is, selecting a value from EquipmentSelect will not move the request to Assigned Requests
    const unassignedRequests = period.requests.filter(r => !r.assignment && !r.pastAssignment);

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
        setIsLoading(true);
        const results = await Promise.all(newAssignments.map((assignment) => {
            return client.models.Request.update({
                id: assignment.requestId,
                assignmentId: assignment.equipmentId
            });
        }));

        let hasErrors = false;
        results.map(({ errors }) => {
            if (errors) {
                hasErrors = true;
                handleError(errors);
            }
        });

        if (!hasErrors) {
            setNewAssignments([]);
            toast.success('Assignments updated');
            router.refresh();
        }
        setIsLoading(false);
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
                        Once given an assignment, any further changes to a request&apos;s equipment assignment will need to
                        be performed manually on the AWS console.
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