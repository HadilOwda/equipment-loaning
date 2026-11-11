import Container from '@/components/primitives/container';
import { Skeleton } from '@/components/ui/skeleton';

export default function RequestsLoading() {
    return (
        <Container>
            <div role='status' aria-busy='true'>
                <span className='sr-only'>Loading</span>
                <Skeleton className='h-9 w-80 mb-6' />
                <div className='grid grid-cols-3 gap-4'>
                    <div className='col-span-3 lg:col-span-2 flex flex-col gap-4'>
                        <Skeleton className='h-8 w-44' />
                        <div className='grid grid-cols-2 gap-4'>
                            <Skeleton className='h-28 w-full' />
                            <Skeleton className='h-28 w-full' />
                        </div>
                    </div>
                    <div className='col-span-3 lg:col-span-1'>
                        <Skeleton className='h-64 w-full' />
                    </div>
                </div>
            </div>
        </Container>
    );
}
