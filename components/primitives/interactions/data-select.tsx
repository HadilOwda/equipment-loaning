'use client'

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import InputLabel from './input-label';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Item {
    label: string;
    value: string;
}

interface DataSelectProps {
    label?: string;
    inputID: string;
    placeholder?: string;
    isRequired?: boolean;  // only shown if label is nonnull
    value: string;
    onChange: (val: string) => void;
    queryData: () => Promise<Item[]>;
    className?: string;
    emptyMessage?: string;
}

export function DataSelect({
    label,
    inputID,
    placeholder = 'Select a value...',
    isRequired = true,
    value,
    onChange,
    queryData,
    className,
    emptyMessage = 'No options available'
}: DataSelectProps) {
    const [dataOptions, setDataOptions] = useState<Item[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    const getDataOptions = async () => {
        setDataOptions(await queryData());
        setHasLoaded(true);
    };

    useEffect(() => {
        getDataOptions();
    }, []);

    const select = (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={cn('w-full', className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {dataOptions.length > 0 ?
                        dataOptions.map((item) =>
                            <SelectItem
                                value={item.value}
                                key={item.value}
                            >{item.label}</SelectItem>
                        )
                        :
                        <SelectLabel>{hasLoaded ? emptyMessage : 'Loading...'}</SelectLabel>
                    }
                </SelectGroup>
            </SelectContent>
        </Select >
    );

    if (label) {
        return (
            <InputLabel
                inputID={inputID}
                label={label}
                isRequired={isRequired}
            >
                {select}
            </InputLabel>
        )
    } else {
        return select;
    }
}