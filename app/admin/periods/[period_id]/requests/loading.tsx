import Container from '@/components/primitives/container';
import { Skeleton } from '@/components/ui/skeleton';

// Requests pages do two slow lookups (the period, then user display names),
// so show the section layout right away
export default function AdminPeriodRequestsLoading() {
    return (
        <Container>
            <div role='status' aria-busy='true'>
                <span className='sr-only'>Loading requests</span>
                <Skeleton className='h-9 w-72 mb-6' />
                <div className='flex flex-col gap-6'>
                    {[0, 1, 2].map(i => (
                        <div key={i} className='flex flex-col gap-3'>
                            <Skeleton className='h-7 w-56' />
                            <Skeleton className='h-14 w-full' />
                        </div>
                    ))}
                </div>
            </div>
        </Container>
    );
}
