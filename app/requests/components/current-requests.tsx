import generateSSRClient from '@/app/utils/generate-ssr-client';
import Header from '@/components/primitives/text/header';
import { cookies } from 'next/headers';
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import outputs from '@/amplify_outputs.json';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { requestsSelectionSet } from '../requests-config';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Subtext from '@/components/primitives/text/subtext';
import { RequestStatus } from '@/amplify/data/constants';
import { AMPLIFY_DATA_LIST_LIMIT } from '@/app/utils/constants';

export default async function CurrentRequests() {
    const client = generateSSRClient();


    const { runWithAmplifyServerContext } = createServerRunner({
        config: outputs
    });

    const { username } = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: async (contextSpec) => {
            // Use `fetchUserAttributes` imported from `aws-amplify/auth/server`
            return await getCurrentUser(contextSpec);
        }
    });

    const { data, errors } = await client.models.Request.list({
        selectionSet: requestsSelectionSet,
        limit: AMPLIFY_DATA_LIST_LIMIT
    });

    // NOTE -- Amplify data doesn't seem to allow filtering by `owner`, so doing
    // it manually here in the event that this is an admin who can see all requests
    const requests = data.filter(request => request.owner == username);

    if (errors) {
        throw new Error(JSON.stringify(errors));
    }

    if (requests.length == 0) {
        return (
            <div>
                <Header>My Requests</Header>
                <Subtext>No requests created (yet!)</Subtext>
            </div>
        )
    }

    return (
        <div>
            <div className='mb-2'>
                <Header className='mb-1'>My Requests</Header>
                <Subtext>Select a request to view details.</Subtext>
            </div>
            <div className='grid grid-cols-2 gap-4'>
                {requests.map(request => {
                   let badgeLabel: string;
                let isBadgeVariantDefault = false;
                
                if (request.status === RequestStatus.DENIED) {
                    badgeLabel = 'Denied';
                } else if (request.pastAssignment) {
                    badgeLabel = 'Returned';
                } else if (request.assignment) {
                    if (request.status === RequestStatus.CHECKED_OUT) {
                        badgeLabel = 'Checked out';
                    } else {
                        badgeLabel = 'Request Approved!';
                        isBadgeVariantDefault = true;
                    }
                } else {
                    badgeLabel = 'Request Pending';
                }

                    return (
                        <Item variant='outline' key={request.id} asChild className='items-start'>
                            <Link href={`/requests/${request.id}`}>
                                <ItemContent>
                                    <div className='flex flex-col gap-0.5'>
                                        <ItemTitle>Request for {request.period.name}</ItemTitle>
                                        <ItemDescription>Created {dayjs(request.createdAt).format('M/D/YY')}</ItemDescription>
                                    </div>
                                    <div>
                                        <Badge variant={isBadgeVariantDefault ? 'default' : 'secondary'}>{badgeLabel}</Badge>
                                    </div>
                                </ItemContent>
                            </Link>
                        </Item>
                    );
                })}
            </div>
        </div >
    )
}
