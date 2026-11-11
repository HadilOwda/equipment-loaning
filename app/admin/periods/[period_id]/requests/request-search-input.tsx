'use client'

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon, XIcon } from 'lucide-react';

interface RequestSearchInputProps {
    value: string;
    onChange: (value: string) => void;
}

export default function RequestSearchInput({ value, onChange }: RequestSearchInputProps) {
    return (
        <div className='relative mb-4'>
            <SearchIcon size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder='Search by student name or equipment ID'
                aria-label='Search requests'
                className='pl-9 pr-9'
            />
            {value !== '' &&
                <Button
                    variant='ghost'
                    size='icon'
                    className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7'
                    aria-label='Clear search'
                    onClick={() => onChange('')}
                >
                    <XIcon size={14} />
                </Button>
            }
        </div>
    );
}
