import { Schema } from '@/amplify/data/resource';
import { SelectionSet } from 'aws-amplify/api';

export const requestWithDetailsSelectionSet = [
    'id',
    'status',
    'collateralDescription',
    'createdAt',
    'period.id',
    'period.name',

    'equipmentTypeRequests.rank',
    'equipmentTypeRequests.equipmentType.id',
    'equipmentTypeRequests.equipmentType.name',

    'assignment.id',
    'assignment.equipmentType.name',

    'pastAssignment.id',
    'pastAssignment.equipmentType.name',
] as const;


export type RequestWithDetails = SelectionSet<Schema['Request']['type'], typeof requestWithDetailsSelectionSet>;
