
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RequestStatus } from '@/amplify/data/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';

interface CancelRequestButtonProps {
    requestId: string;
}

export default function CancelRequestButton({
    requestId,
}: CancelRequestButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const cancelRequest = async () => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            const client = generateClient();

            // Re-fetch the request before allowing cancellation.
            const { data: request, errors: lookupErrors } =
                await client.models.Request.get(
                    { id: requestId },
                    {
                        selectionSet: [
                            'id',
                            'status',
                            'assignmentId',
                            'pastAssignmentId',
                            'equipmentTypeRequests.equipmentTypeId',
                            'equipmentTypeRequests.requestId',
                        ],
                    }
                );

            if (lookupErrors?.length || !request) {
                toast.error('Unable to verify the request.');
                return;
            }

            // Do not cancel requests that are assigned or finalized.
            if (
                request.assignmentId ||
                request.pastAssignmentId ||
                request.status === RequestStatus.DENIED ||
                request.status === RequestStatus.CHECKED_OUT
            ) {
                toast.error('This request can no longer be canceled.');
                return;
            }

            // Delete associated equipment preferences first.
            for (const item of request.equipmentTypeRequests ?? []) {
                const result = await client.models.EquipmentTypeRequest.delete({
                    equipmentTypeId: item.equipmentTypeId,
                    requestId: requestId,
                });

                if (result.errors?.length || !result.data) {
                    throw new Error('Failed to remove equipment preferences.');
                }
            }

            // Delete the request itself.
            const { data, errors } = await client.models.Request.delete({
                id: requestId,
            });

            if (errors?.length || !data) {
                throw new Error('Failed to cancel the request.');
            }

            toast.success('Request canceled successfully.');
            setOpen(false);
            router.push('/requests');

        } catch (error) {
            handleError(
                error instanceof Error
                    ? error.message
                    : 'Unexpected error canceling request.'
            );

            toast.error(
                'Cancellation failed. Some changes may have saved.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={(nextOpen) => {
                if (!isLoading) setOpen(nextOpen);
            }}
        >
            <Dialog.Trigger asChild>
                <Button
                    type='button'
                    variant='destructive'
                    disabled={isLoading}
                >
                    Cancel Request
                </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className='fixed inset-0 z-50 bg-black/60' />

                <Dialog.Content className='fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg'>
                    <Dialog.Title className='text-lg font-semibold'>
                        Cancel this request?
                    </Dialog.Title>

                    <Dialog.Description className='mt-2 text-sm text-muted-foreground'>
                        This will permanently delete your request and its
                        equipment preferences. This action cannot be undone.
                    </Dialog.Description>

                    <div className='mt-6 flex justify-end gap-2'>
                        <Dialog.Close asChild>
                            <Button
                                type='button'
                                variant='outline'
                                disabled={isLoading}
                            >
                                Keep Request
                            </Button>
                        </Dialog.Close>

                        <Button
                            type='button'
                            variant='destructive'
                            disabled={isLoading}
                            onClick={cancelRequest}
                        >
                            {isLoading ? 'Canceling...' : 'Confirm Cancellation'}
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
