import { ArrowRight } from 'lucide-react';
import { ReactNode } from 'react';
import CopyButton from '@/components/primitives/interactions/copy-button';

interface RequestMatchingItemProps {
    requestId: string;
    displayName: string;
    children: ReactNode;
}

export function RequestMatchingItem({ requestId, displayName, children }: RequestMatchingItemProps) {
    return (
        <div className='grid grid-cols-9'>
            <div className='col-span-2 flex items-center gap-3'>
                {displayName}
            </div>
            <div className='col-span-1 flex items-center justify-center'>
                <ArrowRight />
            </div>
            <div className='col-span-4 flex items-center gap-2'>
                {children}
            </div>
            <div className='col-span-2 flex justify-end'>
                <CopyButton
                    value={requestId}
                    label='request ID'
                    buttonLabel='Request ID'
                    hasCopyIcon={true}
                />
            </div>
        </div>
    )
}