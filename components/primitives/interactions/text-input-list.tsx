'use client'

import { Input } from '@/components/ui/input';
import InputLabel from './input-label';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';

interface TextInputListProps {
    onChange: (val: string[]) => void;

    label: string;
    inputID: string;
    isRequired?: boolean;

    addButtonLabel: string;
    initialValues?: string[];  // optional; only read when the component first mounts
}

interface ItemState {
    value: string;
    id: number;  // auto-incrementing int id for idempotency in deletion
}

export default function TextInputList({ onChange, label, inputID, isRequired, addButtonLabel, initialValues }: TextInputListProps) {
    // Starts empty unless `initialValues` is given. Later changes to `initialValues` are ignored,
    // so remount the component (e.g. by closing and reopening a dialog) to reset it.

    const nextIDRef = useRef(initialValues?.length ?? 0);
    const [items, setItems] = useState<ItemState[]>(
        () => (initialValues ?? []).map((value, id) => ({ value, id }))
    );

    useEffect(() => {
        onChange(items.map(item => item.value));
    }, [items]);

    const editItem = (index: number, val: string) => {
        // Use index here since it's more efficient than searching for id every time
        let newItems = [...items];
        newItems[index].value = val;
        setItems(newItems);
    };

    const deleteItem = (id: number) => {
        const newItems = items.filter(v => v.id !== id);
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { value: '', id: nextIDRef.current++ }])
    };


    const accessoryList = items.map((v, i) => {
        return (
            <div className='flex gap-2' key={v.id}>
                <Input
                    value={v.value}
                    onChange={(e) => editItem(i, e.target.value)}
                />
                <Button
                    variant='outline'
                    size='icon'
                    onClick={() => deleteItem(v.id)}
                >
                    <X />
                </Button>
            </div>
        );
    });

    return (
        <InputLabel
            label={label}
            inputID={inputID}
            isRequired={isRequired}
        >
            <div className='grid w-full gap-2'>
                {items.length > 0 && accessoryList}
                <Button variant='secondary' onClick={addItem}>{addButtonLabel}</Button>
            </div>
        </InputLabel>
    );
}