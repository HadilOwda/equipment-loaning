import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Children, isValidElement, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import LoanableEquipmentChecklist from './loanable-equipment-checklist';

jest.mock('react', () => ({
    ...jest.requireActual<typeof import('react')>('react'),
    useState: jest.fn(),
    useEffect: jest.fn()
}));
jest.mock('@/app/utils/generate-client', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@/app/utils/handle-error', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/components/primitives/interactions/checkbox-with-description', () => ({ __esModule: true, default: () => null }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

interface CheckboxProps {
    inputID: string;
    value: boolean | 'indeterminate';
    description?: string;
    onChange: (value: boolean | 'indeterminate') => void;
}

function findCheckbox(tree: ReactNode, inputID: string): CheckboxProps {
    const find = (node: ReactNode): CheckboxProps | undefined => {
        if (!isValidElement<{ inputID?: string; children?: ReactNode }>(node)) return;
        if (node.props.inputID === inputID) return node.props as CheckboxProps;
        for (const child of Children.toArray(node.props.children)) {
            const match = find(child);
            if (match) return match;
        }
    };
    const match = find(tree);
    if (!match) throw new Error(`Checkbox not found: ${inputID}`);
    return match;
}

describe('LoanableEquipmentChecklist', () => {
    const assigned = 'equipment-assigned';
    const checkedOut = 'equipment-checked-out';
    const free = 'equipment-free';
    const other = 'equipment-other';
    const onChange = jest.fn();
    const equipmentTypes = [
        { id: 'cameras', name: 'Cameras', equipmentIds: [assigned, checkedOut, free] },
        { id: 'other', name: 'Other', equipmentIds: [other] }
    ];

    const render = (value: string[], assignedEquipmentIds?: string[]) => {
        jest.mocked(useState)
            .mockReturnValueOnce([equipmentTypes, jest.fn()])
            .mockReturnValueOnce([false, jest.fn()]);
        return LoanableEquipmentChecklist({ value, onChange, assignedEquipmentIds });
    };
    const equipmentCheckbox = (tree: ReactNode, id: string) => findCheckbox(tree, `loanable-equipment-checklist-equipment-${id}`);
    const groupCheckbox = (tree: ReactNode, id = 'cameras') => findCheckbox(tree, `loanable-equipment-checklist-equipment-type-${id}`);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test.each([assigned, checkedOut])('blocks individual removal of %s with an error toast', id => {
        const checkbox = equipmentCheckbox(render([assigned, checkedOut, free], [assigned, checkedOut]), id);
        expect(checkbox.value).toBe(true);
        expect(checkbox.description).toContain('cannot be removed');
        checkbox.onChange(false);
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(onChange).not.toHaveBeenCalled();
    });

    test('bulk unchecking keeps protected items while removing available ones', () => {
        const tree = render([assigned, checkedOut, free], [assigned, checkedOut]);
        expect(groupCheckbox(tree).value).toBe(true);
        groupCheckbox(tree).onChange(false);
        expect(onChange).toHaveBeenCalledWith([assigned, checkedOut]);
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(groupCheckbox(render([assigned, checkedOut], [assigned, checkedOut])).value).toBe('indeterminate');
    });

    test('a group containing only selected protected items cannot be cleared', () => {
        groupCheckbox(render([assigned, checkedOut], [assigned, checkedOut])).onChange(false);
        expect(onChange).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledTimes(1);
    });

    test('allows removing an unassigned item while retaining protected selections', () => {
        equipmentCheckbox(render([assigned, checkedOut, free], [assigned, checkedOut]), free).onChange(false);
        expect(onChange).toHaveBeenCalledWith([assigned, checkedOut]);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('clearing another group leaves assigned items untouched', () => {
        groupCheckbox(render([assigned, other], [assigned]), 'other').onChange(false);
        expect(onChange).toHaveBeenCalledWith([assigned]);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('allows selecting additional equipment', () => {
        equipmentCheckbox(render([assigned], [assigned]), free).onChange(true);
        expect(onChange).toHaveBeenCalledWith([assigned, free]);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('bulk selection adds missing equipment without duplicating existing selections', () => {
        groupCheckbox(render([assigned], [assigned])).onChange(true);
        expect(onChange).toHaveBeenCalledWith([assigned, checkedOut, free]);
        expect(toast.error).not.toHaveBeenCalled();
    });

    test('preserves the new-period checklist behavior when no protected IDs are supplied', () => {
        groupCheckbox(render([assigned, checkedOut, free])).onChange(false);
        expect(onChange).toHaveBeenCalledWith([]);
        expect(toast.error).not.toHaveBeenCalled();
    });
});
