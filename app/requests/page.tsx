import Container from '@/components/primitives/container';
import Title from '@/components/primitives/text/title';
import CurrentRequests from './components/current-requests';
import NewRequest from './components/new-request';
import generateSSRClient from '../utils/generate-ssr-client';
import { periodSelectionSet } from './period-config';
import { AMPLIFY_DATA_LIST_LIMIT } from '../utils/constants';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function RequestsPage() {
  const client = generateSSRClient();

  const periods = await client.models.Period.list({
    selectionSet: periodSelectionSet,
    limit: AMPLIFY_DATA_LIST_LIMIT,
    filter: {
      and: [
        { acceptingRequests: { eq: true } },
        { endDateTime: { gt: (new Date()).toISOString() } }
      ]
    }
  });

  if (periods.errors) {
    throw new Error(JSON.stringify(periods.errors));
  }

  return (
    <Container>
      <Title>StanfordXR Equipment Requests</Title>
      <div className='grid grid-cols-3 gap-4'>
        <div className='col-span-3 lg:col-span-2'>
          <Suspense fallback={<CurrentRequestsSkeleton />}>
            <CurrentRequests />
          </Suspense>
        </div>
        <div className='col-span-3 lg:col-span-1'>
          <NewRequest periods={periods.data} />
        </div>
      </div>
    </Container>
  );
}

function CurrentRequestsSkeleton() {
  return (
    <div role='status' aria-busy='true'>
      <span className='sr-only'>Loading your requests</span>
      <Skeleton className='h-8 w-44 mb-3' />
      <div className='grid grid-cols-2 gap-4'>
        <Skeleton className='h-28 w-full' />
        <Skeleton className='h-28 w-full' />
      </div>
    </div>
  );
}
