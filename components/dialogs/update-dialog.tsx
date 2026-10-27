'use client'

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import CRUDDialog from './crud-dialog';

interface UpdateDialogProps {
    name: string;
    description?: string;
    showIndicatesRequiredField?: boolean;
    children: ReactNode;
    onSubmit: () => Promise<boolean>;  // bool denotes if creation was successful
    canSubmit: boolean;
    onSuccess?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function UpdateDialog({ name, description, showIndicatesRequiredField, children, onSubmit, canSubmit, onSuccess, open, onOpenChange }: UpdateDialogProps) {
    const router = useRouter();

    return <CRUDDialog
        title={`Update ${name}`}
        description={description}
        submitButtonLabel='Update'
        successMessage={`Updated ${name.toLowerCase()}`}
        showIndicatesRequiredField={showIndicatesRequiredField}
        children={children}
        onSubmit={onSubmit}
        canSubmit={canSubmit}
        onSuccess={onSuccess ?? (() => router.refresh())}
        open={open}
        onOpenChange={onOpenChange}
    />
}