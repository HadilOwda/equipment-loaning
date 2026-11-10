
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import { cancelRequestInDatabase } from './cancel-request-operation';

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

            await cancelRequestInDatabase(requestId, {
                getRequest: (id) =>
                    client.models.Request.get(
                        { id },
                        {
                            selectionSet: [
                                'id',
                                'status',
                                'assignmentId',
                                'pastAssignmentId',
                                'equipmentTypeRequests.equipmentTypeId',
                            ],
                        }
                    ),

                deleteEquipmentPreference: (equipmentTypeId, id) =>
                    client.models.EquipmentTypeRequest.delete({
                        equipmentTypeId,
                        requestId: id,
                    }),

                deleteRequest: (id) =>
                    client.models.Request.delete({ id }),
            });

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
