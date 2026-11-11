import generateSSRClient from '@/app/utils/generate-ssr-client';
import PeriodNotFound from '../components/period-not-found';
import { periodRequestsSelectionSet } from './period-requests-config';
import { PeriodType } from '@/amplify/data/constants';
import Requests from './requests';
import ApprovalRequests from './approval-requests';

interface AdminPeriodRequestsPageProps {
	params: {
		period_id: string;
	};
}

export default async function AdminPeriodRequestsPage({ params }: AdminPeriodRequestsPageProps) {
	const client = generateSSRClient();

	const period = await client.models.Period.get({
		id: params.period_id
	}, {
		selectionSet: periodRequestsSelectionSet
	});

	if (period.errors) {
		throw new Error(JSON.stringify(period.errors));
	}

	if (!period.data) {
		return <PeriodNotFound periodID={params.period_id} />;
	}

	// Unique usernames only, so the Lambda has fewer names to look up
	const usernames = Array.from(new Set(
		period.data.requests.map(r => r.owner).filter((owner): owner is string => owner != null)
	));

	const userDisplayNames = await client.queries.getUserDisplayNames({ usernames });

	if (userDisplayNames.errors) {
		throw new Error(JSON.stringify(userDisplayNames.errors));
	}

	if (period.data.periodType == PeriodType.APPROVAL) {
		return <ApprovalRequests period={period.data} userDisplayNames={userDisplayNames.data ?? []} />;
	}

	return <Requests period={period.data} userDisplayNames={userDisplayNames.data ?? []} />;
}