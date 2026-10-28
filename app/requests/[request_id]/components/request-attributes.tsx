'use client'

import { RequestWithDetails } from '../request-details-config';
import AttributeGrid from '@/components/primitives/attribute-grid';
import Attribute from '@/components/primitives/attribute';
import dayjs from 'dayjs';
import CopyButton from '@/components/primitives/interactions/copy-button';
import { RequestStatus } from '@/amplify/data/constants';
import Header from '@/components/primitives/text/header';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import getUserRankLabel from '@/app/utils/get-user-rank-label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CircleCheck } from 'lucide-react';

export default function RequestAttributes({ request }: { request: RequestWithDetails }) {
    let statusLabel: string;
    if (request.pastAssignment) {
        statusLabel = 'Returned';
    } else if (request.assignment) {
        if (request.status == RequestStatus.CHECKED_OUT) {
            statusLabel = 'Checked Out';
        } else if (request.status == RequestStatus.DENIED) {
            statusLabel = 'Denied';
        } else {
            statusLabel = 'Awaiting Checkout';
        }
    } else if (request.status == RequestStatus.DENIED) {
        statusLabel = 'Denied';
    } else {
        statusLabel = 'Request pending';
    }

    const assignment = request.assignment ?? request.pastAssignment;

    return (
        <div className='flex flex-col gap-8'>
            <div>
                <Header>Overview</Header>
                <div className='flex flex-col gap-4'>
                    {
                        assignment && (
                            <Alert className='bg-accent'>
                                <CircleCheck />
                                <AlertTitle>
                                    Assigned equipment: {assignment.equipmentType.name}
                                </AlertTitle>
                                <AlertDescription>Equipment ID {assignment.id}</AlertDescription>
                            </Alert>
                        )
                    }

                    <AttributeGrid>
                        <Attribute
                            label='Status'
                            value={statusLabel}
                        />
                        <Attribute
                            label='Creation date'
                            value={dayjs(request.createdAt).format('M/D/YY [at] h:mm A')}
                        />
                        <Attribute
                            label='Collateral'
                            value={request.collateralDescription}
                        />
                    </AttributeGrid>
                </div>
            </div>

            <div>
                <Header>Requested Equipment</Header>
                <div className='flex flex-col gap-2'>
                    {
                        request.equipmentTypeRequests
                            .sort((a, b) => !a.rank ? 0 : (!b.rank ? 0 : a.rank - b.rank))
                            .map(({ rank, equipmentType }) => {
                                return (
                                    <Item variant='outline' key={equipmentType.id}>
                                        <ItemContent>
                                            <ItemTitle>{equipmentType.name}</ItemTitle>
                                            {
                                                rank && <ItemDescription>{getUserRankLabel(rank)} choice</ItemDescription>
                                            }
                                        </ItemContent>
                                    </Item>
                                )
                            })
                    }
                </div>
            </div>

            <div>
                <Header>Miscellaneous</Header>
                <div className='flex gap-2 items-center'>
                    <div>
                        Request ID: <span className='font-mono bg-muted p-1 rounded-sm'>{request.id}</span>
                    </div>
                    <CopyButton value={request.id} label='request ID' />
                </div>
            </div>
        </div>
    );
}