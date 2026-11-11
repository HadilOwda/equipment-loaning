'use client'

import { PeriodRequests } from './period-requests-config';
import Container from '@/components/primitives/container';
import Title from '@/components/primitives/text/title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import UnassignedRequests from './unassigned-requests';
import AssignedRequests from './assigned-requests';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Header from '@/components/primitives/text/header';
import { useState } from 'react';
import generateAutoMatch from '@/app/actions/generate-auto-match';
import handleError from '@/app/utils/handle-error';
import { ADMIN_PERIODS_MATCHMAKER_DEFAULT_RANK } from '@/app/utils/constants';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { UserDisplayNames } from '../display-names-config';
import { RequestStatus } from '@/amplify/data/constants';
import Subtext from '@/components/primitives/text/subtext';

export interface Assignment {
    equipmentId: string;
    requestId: string;
}

export default function Requests({ period, userDisplayNames }: { period: PeriodRequests, userDisplayNames: UserDisplayNames }) {
    const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);

    const assignedCount = period.requests.filter(
        r => (r.assignment || r.pastAssignment) && r.status !== RequestStatus.DENIED
    ).length;
    const unassignedCount = period.requests.filter(
        r => !r.assignment && !r.pastAssignment && r.status !== RequestStatus.DENIED
    ).length;
    const deniedRequests = period.requests.filter(r => r.status === RequestStatus.DENIED);

    return (
        <Container>
            <Title>{period.name} Requests</Title>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <div className='col-span1 lg:col-span-2'>
                    <Accordion type='multiple' defaultValue={['unassigned-requests']}>
                        {/* Assigned requests */}
                        <AccordionItem value='assigned-requests'>
                            <AccordionTrigger>
                                <Header className='mb-0'>
                                    Assigned Requests ({assignedCount})
                                </Header>
                            </AccordionTrigger>
                            <AccordionContent>
                                <AssignedRequests
                                    period={period}
                                    userDisplayNames={userDisplayNames}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Unassigned requests */}
                        <AccordionItem value='unassigned-requests'>
                            <AccordionTrigger>
                                <Header className='mb-0'>
                                    Unassigned Requests ({unassignedCount})
                                </Header>
                            </AccordionTrigger>
                            <AccordionContent>
                                <UnassignedRequests
                                    period={period}
                                    newAssignments={newAssignments}
                                    setNewAssignments={setNewAssignments}
                                    userDisplayNames={userDisplayNames}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Denied requests */}
                        <AccordionItem value='denied-requests'>
                            <AccordionTrigger>
                                <Header className='mb-0'>
                                    Denied Requests ({deniedRequests.length})
                                </Header>
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
                                                    <ItemTitle>
                                                        {userDisplayNames.find(u => request.owner == u?.username)?.displayName ?? 'USER NOT FOUND'}
                                                    </ItemTitle>
                                                    <ItemDescription>
                                                        Requested: {request.equipmentTypeRequests.map(e => e.equipmentType.name).join(', ')}
                                                    </ItemDescription>
                                                </ItemContent>
                                            </Item>
                                        )}
                                    </div>
                                }
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <div className='col-span-1 flex flex-col gap-4'>
                    <Matchmaker period={period} setNewAssignments={setNewAssignments} />
                    <AvailableEquipment period={period} newAssignments={newAssignments} />
                </div>
            </div>
        </Container>
    );
}

function Matchmaker({ period, setNewAssignments }: { period: PeriodRequests, setNewAssignments: (assignments: Assignment[]) => void }) {
    const [isLoading, setIsLoading] = useState(false);

    const availableEquipment = period.loanableEquipment
        .map(e => e.equipment)
        .filter(e => !e.assignment)
        .map(e => ({
            equipmentTypeId: e.equipmentTypeId,
            equipmentId: e.id
        }));

    const requests = period.requests
        .filter(request => !request.assignment && !request.pastAssignment)
        .map(request => ({
            requestId: request.id,
            equipmentTypeRequests: request.equipmentTypeRequests.map(equipmentTypeRequest => ({
                equipmentTypeId: equipmentTypeRequest.equipmentType.id,
                rank: equipmentTypeRequest.rank ?? ADMIN_PERIODS_MATCHMAKER_DEFAULT_RANK
            }))
        }));

    const handleMatch = async () => {
        setIsLoading(true);
        try {
            const newAssignments = await generateAutoMatch({
                availableEquipment,
                requests
            });
            setNewAssignments(newAssignments);
            toast.info('Populated assignments with matchmaker results');
        } catch (err: any) {
            handleError(err);
        }
        setIsLoading(false);
    }

    return (
        <Card className='gap-4'>
            <CardHeader>
                <CardTitle>
                    Matching Algorithm
                </CardTitle>
                <CardDescription>
                    Populates Unassigned Requests with the optimal request/equipment matches based on user rankings.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {availableEquipment.length == 0 || requests.length == 0 ?
                    <Alert>
                        <AlertCircleIcon />
                        <AlertTitle>Unable to run matching algorithm</AlertTitle>
                        <AlertDescription>The matching algorithm requires at least one unassigned request and one available equipment to run.</AlertDescription>
                    </Alert>
                    :
                    <>
                        <Button
                            className='w-full'
                            disabled={isLoading}
                            onClick={handleMatch}
                        >
                            {isLoading ? 'Loading...' : 'Run matching algorithm'}
                        </Button>
                        <Dialog>
                            <div className='flex justify-center pt-1'>
                                <DialogTrigger asChild>
                                    <Button variant='link' size='sm'>More info</Button>
                                </DialogTrigger>
                            </div>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Matching algorithm considerations</DialogTitle>
                                    <ul className='list-disc list-inside text-sm'>
                                        <li>
                                            Running the algorithm does not propagate matches to users until you select Save Assignments.
                                        </li>
                                        <li>
                                            Running the algorithm will overwrite any current match selections in Unassigned Requests.
                                        </li>
                                    </ul>
                                </DialogHeader>
                            </DialogContent>
                        </Dialog>
                    </>
                }
            </CardContent>
        </Card >
    )
}

function AvailableEquipment({ period, newAssignments }: { period: PeriodRequests, newAssignments: Assignment[] }) {
    const availableEquipment = period.loanableEquipment
        .map(l => l.equipment)
        .filter(equipment =>
            !equipment.assignment && !newAssignments.some(assignment => assignment.equipmentId == equipment.id)
        )
        .map(equipment => {
            return {
                equipmentTypeName: equipment.equipmentType.name,
                equipmentId: equipment.id
            };
        });

    return (
        <Card className='gap-4'>
            <CardHeader>
                <CardTitle>Available Equipment</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-3 max-h-[350px] overflow-auto'>
                {
                    availableEquipment.map(({ equipmentTypeName, equipmentId }) => {
                        return (
                            <Item variant='outline' className='p-3' key={equipmentId}>
                                <ItemContent>
                                    <ItemTitle>{equipmentId}</ItemTitle>
                                    <ItemDescription>{equipmentTypeName}</ItemDescription>
                                </ItemContent>
                            </Item>
                        );
                    })
                }
            </CardContent>
        </Card>
    )
}