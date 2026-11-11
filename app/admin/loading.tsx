import Container from '@/components/primitives/container';
import { Skeleton } from '@/components/ui/skeleton';

// Shown in the content area of any admin page while its data loads
export default function AdminLoading() {
    return (
        <Container>
            <div role='status' aria-busy='true'>
                <span className='sr-only'>Loading</span>
                <Skeleton className='h-9 w-56 mb-6' />
                <div className='flex flex-col gap-4'>
                    <Skeleton className='h-6 w-40' />
                    <Skeleton className='h-24 w-full' />
                    <Skeleton className='h-24 w-full' />
                    <Skeleton className='h-24 w-full' />
                </div>
            </div>
        </Container>
    );
}
