import { type Schema } from '@/amplify/data/resource';
import { ColumnDef } from '@tanstack/react-table'
import { SelectionSet } from 'aws-amplify/api';
import EquipmentTypeActions from './equipment-type-actions';

const nameColumn: ColumnDef<EquipmentType> = {
    accessorKey: 'name',
    header: 'Equipment Type',
    cell: ({ row }) => row.getValue('name')
};

const actionsColumn: ColumnDef<EquipmentType> = {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
        return <EquipmentTypeActions equipmentType={row.original} />;
    },
};

export const equipmentTypeColumns: ColumnDef<EquipmentType>[] = [
    nameColumn,
    actionsColumn
];

export const equipmentTypeSelectionSet = ['id', 'name'] as const;
export type EquipmentType = SelectionSet<Schema['EquipmentType']['type'], typeof equipmentTypeSelectionSet>;