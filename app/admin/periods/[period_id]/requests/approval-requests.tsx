'use client'

import { PeriodRequests } from './period-requests-config';
import Container from '@/components/primitives/container';
import Title from '@/components/primitives/text/title';
import Header from '@/components/primitives/text/header';
import Subtext from '@/components/primitives/text/subtext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import EquipmentSelect, { EquipmentSelectItem } from '../components/equipment-select';
import AssignedRequests from './assigned-requests';
import { UserDisplayNames } from '../display-names-config';
import { RequestStatus } from '@/amplify/data/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import validateAssignments from '@/app/utils/validate-assignments';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type PeriodRequest = PeriodRequests['requests'][number];

interface ApprovalRequestsProps {
    period: PeriodRequests;
    userDisplayNames: UserDisplayNames;
}

export default function ApprovalRequests({ period, userDisplayNames }: ApprovalRequestsProps) {
    const isUnassigned = (r: PeriodRequest) => !r.assignment && !r.pastAssignment;
    const pendingRequests = period.requests.filter(r => isUnassigned(r) && r.status != RequestStatus.DENIED);
    const deniedRequests = period.requests.filter(r => isUnassigned(r) && r.status == RequestStatus.DENIED);

    const getDisplayName = (request: PeriodRequest) =>
        userDisplayNames.find(u => request.owner == u?.username)?.displayName ?? 'USER NOT FOUND';

    return (
        <Container>
            <Title>{period.name} Requests</Title>
            <Accordion type='multiple' defaultValue={['pending-requests']}>
                <AccordionItem value='pending-requests'>
                    <AccordionTrigger>
                        <Header className='mb-0'>Pending Requests ({pendingRequests.length})</Header>
                    </AccordionTrigger>
                    <AccordionContent>
                        <PendingRequests
                            period={period}
                            requests={pendingRequests}
                            getDisplayName={getDisplayName}
                        />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value='approved-requests'>
                    <AccordionTrigger>
                        <Header className='mb-0'>Approved Requests</Header>
                    </AccordionTrigger>
                    <AccordionContent>
                        <AssignedRequests period={period} userDisplayNames={userDisplayNames} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value='denied-requests'>
                    <AccordionTrigger>
                        <Header className='mb-0'>Denied Requests ({deniedRequests.length})</Header>
                    </AccordionTrigger>
                    <AccordionContent>
                        {deniedRequests.length == 0 ?
                            <div className='text-center'>
                                <Subtext>No denied requests</Subtext>
                            </div>
                            :
                            <div className='flex flex-col gap-2'>
                                {deniedRequests.map(request =>
                                    <Item variant='outline' key={request.id}>
                                        <ItemContent>
                                            <ItemTitle>{getDisplayName(request)}</ItemTitle>
                                            <ItemDescription>
                                                Requested: {getRequestedTypeNames(request)}
                                            </ItemDescription>
                                        </ItemContent>
                                    </Item>
                                )}
                            </div>
                        }
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Container>
    );
}

function getRequestedTypeNames(request: PeriodRequest) {
    return request.equipmentTypeRequests.map(e => e.equipmentType.name).join(', ');
}

interface PendingRequestsProps {
    period: PeriodRequests;
    requests: PeriodRequest[];
    getDisplayName: (request: PeriodRequest) => string;
}

function PendingRequests({ period, requests, getDisplayName }: PendingRequestsProps) {
    const router = useRouter();
    // requestId -> selected equipmentId
    const [selections, setSelections] = useState<{ [requestId: string]: string }>({});
    const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);

    const assignedEquipmentIds = period.loanableEquipment
        .map(({ equipment }) => equipment)
        .filter(equipment => equipment.assignment)
        .map(equipment => equipment.id);

    // Create object that maps from equipmentTypeId -> EquipmentSelectItem, then decompose into a list after
    let equipmentSelectItemsObject: { [equipmentTypeId: string]: EquipmentSelectItem } = {};
    period.loanableEquipment.map(({ equipment }) => {
        const entry = {
            equipmentId: equipment.id,
            isAvailable: !equipment.assignment && !Object.values(selections).includes(equipment.id)
        };

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

    const setSelection = (requestId: string, equipmentId: string | null) => {
        let result = { ...selections };
        if (equipmentId) {
            result[requestId] = equipmentId;
        } else {
            delete result[requestId];
        }
        setSelections(result);
    };

    const approveRequest = async (requestId: string) => {
        const equipmentId = selections[requestId];
        const validationError = validateAssignments([{ equipmentId, requestId }], assignedEquipmentIds);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setLoadingRequestId(requestId);
        const { errors } = await generateClient().models.Request.update({
            id: requestId,
            assignmentId: equipmentId
        });
        setLoadingRequestId(null);

        if (errors) {
            handleError(errors);
            return;
        }

        setSelection(requestId, null);
        toast.success(`Request approved with equipment ${equipmentId}`);
        router.refresh();
    };

    const denyRequest = async (requestId: string) => {
        setLoadingRequestId(requestId);
        const { errors } = await generateClient().models.Request.update({
            id: requestId,
            status: RequestStatus.DENIED
        });
        setLoadingRequestId(null);

        if (errors) {
            handleError(errors);
            return;
        }

        setSelection(requestId, null);
        toast.success('Request denied');
        router.refresh();
    };

    if (requests.length == 0) {
        return (
            <div className='text-center'>
                <Subtext>No pending requests</Subtext>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-2'>
            {requests.map(request => {
                const requestedTypeIds = request.equipmentTypeRequests.map(e => e.equipmentType.id);
                // Show the user's requested equipment types first, but allow any loanable equipment to be assigned
                const items = equipmentSelectItems
                    .map(item => ({ ...item, isUserRequested: requestedTypeIds.includes(item.equipmentTypeId) }))
                    .sort((a, b) => Number(b.isUserRequested) - Number(a.isUserRequested));
                const isLoading = loadingRequestId == request.id;
                const displayName = getDisplayName(request);

                return (
                    <Item variant='outline' key={request.id} className='flex-col items-stretch sm:flex-row sm:items-center'>
                        <ItemContent>
                            <ItemTitle>{displayName}</ItemTitle>
                            <ItemDescription>
                                Requested: {getRequestedTypeNames(request)}
                            </ItemDescription>
                        </ItemContent>
                        <ItemActions className='flex-col items-stretch sm:flex-row sm:items-center'>
                            <div className='sm:w-56'>
                                <EquipmentSelect
                                    items={items}
                                    value={selections[request.id] ?? ''}
                                    onChange={(equipmentId) => setSelection(request.id, equipmentId)}
                                    onClearValue={() => setSelection(request.id, null)}
                                />
                            </div>
                            <Button
                                disabled={!selections[request.id] || isLoading}
                                onClick={() => approveRequest(request.id)}
                            >
                                Approve
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant='outline' disabled={isLoading}>Deny</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Deny request from {displayName}?</DialogTitle>
                                        <DialogDescription>
                                            The user will see this request as denied. This cannot be undone from this page.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant='outline'>Cancel</Button>
                                        </DialogClose>
                                        <DialogClose asChild>
                                            <Button variant='destructive' onClick={() => denyRequest(request.id)}>
                                                Deny request
                                            </Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </ItemActions>
                    </Item>
                );
            })}
        </div>
    );
}
