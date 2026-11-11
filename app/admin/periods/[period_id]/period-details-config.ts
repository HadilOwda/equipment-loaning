import { Schema } from '@/amplify/data/resource';
import { SelectionSet } from 'aws-amplify/api';

export const periodWithDetailsSelectionSet = [
    'id',
    'name',
    'periodType',
    'startDateTime',
    'endDateTime',
    'acceptingRequests',

    'loanableEquipment.equipment.id',
    'loanableEquipment.equipment.assignment.id',
    'loanableEquipment.equipment.assignment.status',
    'loanableEquipment.equipment.equipmentType.name',

    'requests.status',
    'requests.assignment.id',
    'requests.pastAssignment.id',
] as const;
export type PeriodWithDetails = SelectionSet<Schema['Period']['type'], typeof periodWithDetailsSelectionSet>;
