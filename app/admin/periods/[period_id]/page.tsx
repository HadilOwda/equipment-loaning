import { PeriodType, RequestStatus } from '@/amplify/data/constants';
import generateSSRClient from '@/app/utils/generate-ssr-client';
import Container from '@/components/primitives/container';
import Header from '@/components/primitives/text/header';
import Title from '@/components/primitives/text/title';
import dayjs from 'dayjs';
import Subtext from '@/components/primitives/text/subtext';
import { PeriodWithDetails, periodWithDetailsSelectionSet } from './period-details-config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon, CircleCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import PeriodNotFound from './components/period-not-found';
import AttributeGrid from '@/components/primitives/attribute-grid';
import Attribute from '@/components/primitives/attribute';
import UpdateLoanableEquipmentDialog from './components/update-loanable-equipment-dialog';
import UpdatePeriodDialog from './components/update-period-dialog';
import DeletePeriodDialog from './components/delete-period-dialog';

interface AdminPeriodPageProps {
  params: {
    period_id: string;
  };
}

export default async function AdminPeriodPage({ params }: AdminPeriodPageProps) {
  const client = generateSSRClient();
  const period = await client.models.Period.get({
    id: params.period_id
  }, {
    selectionSet: periodWithDetailsSelectionSet
  });

  if (period.errors) {
    throw new Error(JSON.stringify(period.errors));
  }

  if (!period.data) {
    return <PeriodNotFound periodID={params.period_id} />;
  }


  return (
    <Container>
      <div className='flex flex-wrap items-center gap-2 mb-4'>
        <Title className='mb-0 grow'>{period.data.name}</Title>
        <UpdatePeriodDialog period={period.data} />
        <DeletePeriodDialog period={period.data} />
      </div>
      <div className='flex flex-col gap-8'>
        <PeriodOverview period={period.data} />
        <PeriodLoanableEquipment period={period.data} />
        <PeriodRequestsSummary period={period.data} />
      </div>
    </Container>
  );
}

function PeriodOverview({ period }: { period: PeriodWithDetails }) {
  const startDateTime = dayjs(period.startDateTime).format('M/D/YY [at] h:mm A');
  const endDateTime = dayjs(period.endDateTime).format('M/D/YY [at] h:mm A');

  return (
    <div>
      <Header>Overview</Header>
      <AttributeGrid>
        <Attribute label='Period Type' value={
          period.periodType == PeriodType.MATCH ? 'Hackathon Loaning' : 'General Loaning'
        } />
        <Attribute label='Start Date' value={startDateTime} />
        <Attribute label='End Date' value={endDateTime} />
        <Attribute label='New Requests' value={
          period.acceptingRequests ? 'Accepting new requests' : 'Not accepting new requests'
        } />
      </AttributeGrid>
    </div>
  );
}

function PeriodLoanableEquipment({ period }: { period: PeriodWithDetails }) {
  const equipment: PeriodWithDetails['loanableEquipment'][number]['equipment'][] = period.loanableEquipment.map((l) => l.equipment);
  const nonAssignedEquipmentCount = equipment.filter((e) => !e.assignment).length;

  return (
    <div>
      <div className='mb-2'>
        <div className='flex justify-between items-center'>
          <Header className='mb-1'>Loanable Equipment ({equipment.length})</Header>
          <UpdateLoanableEquipmentDialog
            periodId={period.id}
            initialLoanableEquipment={equipment.map(e => e.id)}
            assignedEquipmentIds={equipment.filter(e => e.assignment).map(e => e.id)}
          />
        </div>
        <Subtext>Equipment that can be checked out in this period.</Subtext>
      </div>

      <Alert className='mb-1 w-fit'>
        {nonAssignedEquipmentCount == 0 ?
          <>
            <AlertCircleIcon />
            <AlertTitle>
              All loanable equipment is assigned.
            </AlertTitle>
          </>
          :
          <>
            <CircleCheckIcon />
            <AlertTitle>
              {nonAssignedEquipmentCount} of {equipment.length} equipments available to loan
            </AlertTitle>
          </>
        }
      </Alert>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipment Type</TableHead>
            <TableHead>Equipment ID</TableHead>
            <TableHead>Checkout Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {equipment
            .sort((a, b) =>
              a.equipmentType.name.localeCompare(b.equipmentType.name)
            ).map((e) => {
              return (
                <TableRow key={e.id}>
                  <TableCell>{e.equipmentType.name}</TableCell>
                  <TableCell>{e.id}</TableCell>
                  <TableCell>{e.assignment ?
                    <div className='flex items-center gap-1'>
                      {e.assignment.status === RequestStatus.CHECKED_OUT ? 'Checked Out' : 'Assigned'}
                    </div>
                    :
                    <div className='flex items-center gap-1'>Available</div>
                  }</TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      {equipment.length == 0 &&
        <div className='text-muted-foreground py-4 text-center text-sm'>No loanable equipment</div>
      }
    </div>
  )
}

function PeriodRequestsSummary({ period }: { period: PeriodWithDetails }) {
  const isDenied = (r: PeriodWithDetails['requests'][number]) => r.status === RequestStatus.DENIED;
  const deniedRequests = period.requests.filter(isDenied).length;
  const unassignedRequests = period.requests.filter((r) => !isDenied(r) && !r.assignment && !r.pastAssignment).length;
  const assignedRequests = period.requests.filter((r) => !isDenied(r) && r.assignment).length;
  const returnedRequests = period.requests.filter((r) => !isDenied(r) && !r.assignment && r.pastAssignment).length;

  return (
    <div>
      <div className='mb-2'>
        <Header className='mb-1'>Requests Summary</Header>
        <Subtext>
          Requests are submitted by general users and link to one or more requested equipment types.
        </Subtext>
      </div>

      <AttributeGrid className='mb-2'>
        <Attribute label='Unassigned request count' value={`${unassignedRequests} unassigned`} />
        <Attribute label='Assigned (in progress) request count' value={`${assignedRequests} assigned`} />
        <Attribute label='Assigned (returned) request count' value={`${returnedRequests} returned`} />
        <Attribute label='Denied request count' value={`${deniedRequests} denied`} />
      </AttributeGrid>

      <Button asChild>
        <Link href={`/admin/periods/${period.id}/requests`}>
          View requests
        </Link>
      </Button>
    </div>
  );
}
