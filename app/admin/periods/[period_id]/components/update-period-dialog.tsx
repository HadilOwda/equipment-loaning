'use client'

import useAmplify from '@/app/hooks/use-amplify';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import UpdateDialog from '@/components/dialogs/update-dialog';
import CheckboxWithDescription from '@/components/primitives/interactions/checkbox-with-description';
import InputLabel from '@/components/primitives/interactions/input-label';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label';
import Subtext from '@/components/primitives/text/subtext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import type { PeriodWithDetails } from '../period-details-config';

export default function UpdatePeriodDialog({ period }: { period: PeriodWithDetails }) {
    useAmplify();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(period.name);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [acceptingRequests, setAcceptingRequests] = useState(period.acceptingRequests);

    useEffect(() => {
        if (open) {
            setName(period.name);
            setDateRange({ from: new Date(period.startDateTime), to: new Date(period.endDateTime) });
            setAcceptingRequests(period.acceptingRequests);
        }
    }, [period, open]);

    const updatePeriod = async () => {
        const client = generateClient();
        const result = await client.models.Period.update({
            id: period.id,
            name: name.trim(),
            startDateTime: dateRange?.from?.toISOString(),
            endDateTime: dateRange?.to?.toISOString(),
            acceptingRequests
        });

        if (result.errors) {
            throw new Error(JSON.stringify(result.errors));
        }

        return true;
    };

    return (
        <>
            <Button variant='secondary' onClick={() => setOpen(true)}>Update Period</Button>
            <UpdateDialog
                name='Period'
                description='The period type cannot be changed.'
                open={open}
                onOpenChange={setOpen}
                onSubmit={updatePeriod}
                canSubmit={name.trim() != '' && dateRange?.from != undefined && dateRange?.to != undefined}
            >
                <TextInputWithLabel
                    inputID={`period-name-${period.id}`}
                    label='Period Name'
                    value={name}
                    onChange={setName}
                />

                <InputLabel label='Period Dates' isRequired={true}>
                    <Calendar
                        mode='range'
                        required={true}
                        selected={dateRange}
                        onSelect={setDateRange}
                        defaultMonth={dateRange?.from}
                        className='rounded-lg border mt-1'
                    />
                    {
                        dateRange?.from && dateRange?.to &&
                        <Subtext>
                            {dayjs(dateRange.from).format('M/D/YY [at] h:mm A')} to {dayjs(dateRange.to).format('M/D/YY [at] h:mm A')}
                        </Subtext>
                    }
                </InputLabel>

                <CheckboxWithDescription
                    inputID={`period-accepting-requests-${period.id}`}
                    label='Accept new user requests'
                    value={acceptingRequests}
                    onChange={(val) => {
                        if (val == 'indeterminate') {
                            handleError('Error: expected boolean for acceptingRequests checkbox, but got indeterminate');
                            return;
                        }
                        setAcceptingRequests(val);
                    }}
                />
            </UpdateDialog>
        </>
    );
}
