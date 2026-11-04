
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { RequestStatus } from '@/amplify/data/constants';
import { Button } from '@/components/ui/button';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';

interface DenyRequestButtonProps {
    requestId: string;
    hasAssignment?: boolean;
    onDenied?: () => void;
}

export default function DenyRequestButton({
    requestId,
    hasAssignment = false,
    onDenied,
}: DenyRequestButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const denyRequest = async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const client = generateClient();
            const { data, errors } = await client.models.Request.update({
                id: requestId,
                status: RequestStatus.DENIED,
                assignmentId: null,
            });

            if (errors?.length) {
                handleError(errors);
                toast.error('Could not deny the request.');
                return;
            }

            if (!data) {
                handleError('Request update returned no data.');
                toast.error('Could not deny the request.');
                return;
            }

            onDenied?.();
            setOpen(false);
            toast.success('Request denied.');
            router.refresh();
        } catch (error) {
            handleError(
                error instanceof Error
                    ? error.message
                    : 'Unexpected error denying request.'
            );
            toast.error('Could not deny the request.');
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
                    Deny Request
                </Button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className='fixed inset-0 z-50 bg-black/60' />

                <Dialog.Content className='fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg'>
                    <Dialog.Title className='text-lg font-semibold'>
                        Deny this request?
                    </Dialog.Title>

                    <Dialog.Description className='mt-2 text-sm text-muted-foreground'>
                        This will mark the request as denied.
                        {hasAssignment
                            ? ' Its current equipment assignment will be removed.'
                            : ''}
                        {' '}This action can only be reversed by updating the request again.
                    </Dialog.Description>

                    <div className='mt-6 flex justify-end gap-2'>
                        <Dialog.Close asChild>
                            <Button
                                type='button'
                                variant='outline'
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        </Dialog.Close>

                        <Button
                            type='button'
                            variant='destructive'
                            disabled={isLoading}
                            onClick={denyRequest}
                        >
                            {isLoading ? 'Denying...' : 'Confirm Denial'}
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
