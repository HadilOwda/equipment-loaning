import generateSSRClient from '@/app/utils/generate-ssr-client';
import Container from '@/components/primitives/container';
import Title from '@/components/primitives/text/title';
import { requestWithDetailsSelectionSet } from './request-details-config';
import RequestAttributes from './components/request-attributes';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import EditRequestForm from './components/edit-request-form';
import CancelRequestButton from './components/cancel-request-button';
import { periodSelectionSet } from '../period-config';
import { RequestStatus } from '@/amplify/data/constants';

interface RequestPageProps {
	params: {
		request_id: string;
	};
}

export default async function RequestPage({ params }: RequestPageProps) {
	const client = generateSSRClient();

	const { data: request, errors } = await client.models.Request.get({ id: params.request_id }, {
		selectionSet: requestWithDetailsSelectionSet
	});

	if (errors) {
		throw new Error(JSON.stringify(errors));
	}

	if (!request) {
		return (
			<div className='flex items-center justify-center w-full h-full text-muted-foreground'>
				<div className='text-center'>
					<div>Request not found.</div>
					<div>Request id: <span className='font-mono'>{params.request_id}</span></div>
				</div>
			</div>
		);
	}
	
const { data: period, errors: periodErrors } =
    await client.models.Period.get(
        { id: request.period.id },
        { selectionSet: periodSelectionSet }
    );

if (periodErrors?.length) {
    throw new Error(JSON.stringify(periodErrors));
}

	if (!period) {
    throw new Error('Loaning period not found');
}

const canModifyRequest =
    !request.assignment &&
    !request.pastAssignment &&
    request.status !== RequestStatus.DENIED &&
    request.status !== RequestStatus.CHECKED_OUT;

	return (
		<Container width='tight'>
			<Link href='/requests' className='text-sm text-muted-foreground py-1 mb-0.5 w-fit flex items-center gap-0.5'>
				<ChevronLeft size={16} />
				Back
			</Link>
			<Title>Request for {request.period.name}</Title>
			<RequestAttributes request={request} />
			
{canModifyRequest && (
    <div className='flex flex-col gap-4 mt-6'>
        <EditRequestForm
            request={request}
            period={period}
        />
        <CancelRequestButton
            requestId={request.id}
        />
    </div>
)}

		</Container>
	);
}
