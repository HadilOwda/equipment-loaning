'use client'

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import CRUDDialog from './crud-dialog';

interface CreateDialogProps {
    name: string;
    description?: string;
    showIndicatesRequiredField?: boolean;
    children: ReactNode;
    onSubmit: () => Promise<boolean>;  // bool denotes if creation was successful
    canSubmit: boolean;
    onSuccess?: () => void;
}

export default function CreateDialog({ name, description, showIndicatesRequiredField, children, onSubmit, canSubmit, onSuccess }: CreateDialogProps) {
    const router = useRouter();

    return <CRUDDialog
        title={`Create ${name}`}
        description={description}
        submitButtonLabel='Create'
        successMessage={`New ${name.toLowerCase()} created`}
        showIndicatesRequiredField={showIndicatesRequiredField}
        children={children}
        onSubmit={onSubmit}
        canSubmit={canSubmit}
        onSuccess={onSuccess ?? (() => router.refresh())}
    />
}