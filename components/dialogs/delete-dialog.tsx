'use client'

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import CRUDDialog from './crud-dialog';

interface DeleteDialogProps {
    name: string;
    description?: string;
    children?: ReactNode;
    onSubmit: () => Promise<boolean>;
    canSubmit: boolean;
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function DeleteDialog({
    name,
    description,
    children,
    onSubmit,
    canSubmit,
    onSuccess,
    open,
    onOpenChange
}: DeleteDialogProps) {
    const router = useRouter();

    return <CRUDDialog
        title={`Delete ${name}`}
        description={description}
        submitButtonLabel='Delete'
        successMessage={`Deleted ${name.toLowerCase()}`}
        showIndicatesRequiredField={false}
        children={children}
        onSubmit={onSubmit}
        canSubmit={canSubmit}
        onSuccess={onSuccess ?? (() => router.refresh())}
        open={open}
        onOpenChange={onOpenChange}
        destructive
    />
}
