'use client'

import handleError from '@/app/utils/handle-error';
import { TextInputWithLabel } from '@/components/primitives/interactions/text-input-with-label'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { ReactNode, useState } from 'react';
import { toast } from 'sonner';

interface CRUDDialogProps {
    title: string;
    description?: string;
    submitButtonLabel: string;
    successMessage: string;
    showIndicatesRequiredField?: boolean;
    children: ReactNode;
    onSubmit: () => Promise<boolean>;  // bool denotes if operation was successful
    canSubmit: boolean;
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    destructive?: boolean;
}

export default function CRUDDialog({
    title,
    description,
    submitButtonLabel,
    successMessage,
    showIndicatesRequiredField = true,
    children,
    onSubmit,
    canSubmit,
    onSuccess,
    open: controlledOpen,
    onOpenChange,
    destructive = false
}: CRUDDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const open = controlledOpen ?? internalOpen;

    const setOpen = (nextOpen: boolean) => {
        if (controlledOpen === undefined) {
            setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
    };

    const submit = async () => {
        setIsLoading(true);
        try {
            const success = await onSubmit();
            if (success) {
                onSuccess?.();
                setOpen(false);
                toast.success(successMessage);
            }
        } catch (err) {
            handleError(err);
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger asChild>
                    <Button variant='secondary'>{title}</Button>
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className='flex flex-col gap-1'>
                        {description}
                        {showIndicatesRequiredField && <span><span className='text-red-500'>*</span> indicates a required field</span>}
                    </DialogDescription>
                </DialogHeader>

                {children}

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant='secondary'>Cancel</Button>
                    </DialogClose>
                    <Button
                        disabled={isLoading || !canSubmit}
                        type='submit'
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={submit}
                    >
                        {isLoading ? 'Loading...' : submitButtonLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}