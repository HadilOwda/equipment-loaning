'use client'
import { AMPLIFY_DATA_LIST_LIMIT } from '@/app/utils/constants';
import generateClient from '@/app/utils/generate-client';
import handleError from '@/app/utils/handle-error';
import CheckboxWithDescription from '@/components/primitives/interactions/checkbox-with-description';
import Subtext from '@/components/primitives/text/subtext';
import { CheckedState } from '@radix-ui/react-checkbox';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';


interface LoanableEquipmentChecklistProps {
    value: string[];
    onChange: (equipmentIds: string[]) => void;  // write only
    assignedEquipmentIds?: string[];
}

type EquipmentTypeAndEquipment = {
    id: string;
    name: string;
    equipmentIds: string[];
}

export default function LoanableEquipmentChecklist({ value, onChange, assignedEquipmentIds = [] }: LoanableEquipmentChecklistProps) {
    const client = generateClient();
    const [equipmentByTypes, setEquipmentByTypes] = useState<EquipmentTypeAndEquipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const getEquipmentTypesAndEquipment = async () => {
            const { data, errors } = await client.models.EquipmentType.list({
                selectionSet: ['id', 'name', 'equipments.id'],
                limit: AMPLIFY_DATA_LIST_LIMIT
            });

            if (errors) {
                console.error(errors);
                handleError(errors);
                return;
            }

            setEquipmentByTypes(data.reduce<EquipmentTypeAndEquipment[]>((previous, { id, name, equipments }) => {
                const equipmentIds = equipments.map(e => e.id);
                if (equipmentIds.length > 0) {  // filter EquipmentTypes with no Equipment
                    previous.push({ id, name, equipmentIds });
                }
                return previous;
            }, []));
            setIsLoading(false);
        }

        getEquipmentTypesAndEquipment();
    }, []);

    const checkEquipmentIdsIfNotAlready = (equipmentIds: string[]) => {
        let addedEquipmentIds: string[] = [];
        equipmentIds.map((e) => {
            if (!value.includes(e)) {
                addedEquipmentIds.push(e);
            }
        });
        onChange(value.concat(addedEquipmentIds));
    }

    const uncheckEquipmentIdsIfNotAlready = (equipmentIds: string[]) => {
        if (equipmentIds.some(id => value.includes(id) && assignedEquipmentIds.includes(id))) {
            toast.error('Assigned or checked-out equipment cannot be removed.');
        }
        const nextValue = value.filter(id => !equipmentIds.includes(id) || assignedEquipmentIds.includes(id));
        if (nextValue.length !== value.length) {
            onChange(nextValue);
        }
    }

    if (isLoading) {
        return (
            <Subtext>
                Loading equipment...
            </Subtext>
        );
    }

    return (
        <div className='max-h-[350px] overflow-auto py-1'>
            {equipmentByTypes.map((equipmentType) => {
                const numEquipmentsSelected = equipmentType.equipmentIds.filter(
                    (equipmentId) => value.includes(equipmentId)
                );

                let checkedState: CheckedState;
                if (numEquipmentsSelected.length == equipmentType.equipmentIds.length) {
                    checkedState = true;
                } else if (numEquipmentsSelected.length > 0) {
                    checkedState = 'indeterminate';
                } else {
                    checkedState = false;
                }


                return (
                    <div key={equipmentType.id} className='mb-2'>
                        <div>
                            <CheckboxWithDescription
                                inputID={`loanable-equipment-checklist-equipment-type-${equipmentType.id}`}
                                label={equipmentType.name}
                                value={checkedState}
                                onChange={(val) => {
                                    if (val == 'indeterminate') {
                                        handleError('Expected non-indeterminate new checked state for EquipmentType checkbox, but got indeterminate');
                                    } else if (val) {
                                        checkEquipmentIdsIfNotAlready(equipmentType.equipmentIds);
                                    } else {
                                        uncheckEquipmentIdsIfNotAlready(equipmentType.equipmentIds);
                                    }
                                }} />
                        </div>

                        <div className='ms-6'>
                            {
                                equipmentType.equipmentIds.map((equipmentId) => {
                                    return (
                                        <div key={equipmentId} className='py-1'>
                                            <CheckboxWithDescription
                                                inputID={`loanable-equipment-checklist-equipment-${equipmentId}`}
                                                label={equipmentId}
                                                description={assignedEquipmentIds.includes(equipmentId) ? 'Assigned or checked out; cannot be removed' : undefined}
                                                value={value.includes(equipmentId)}
                                                onChange={(val) => {
                                                    if (val == 'indeterminate') {
                                                        handleError('Expected non-indeterminate new checked state for Equipment checkbox, but got indeterminate');
                                                    } else if (val) {
                                                        onChange(value.concat([equipmentId]));
                                                    } else {
                                                        uncheckEquipmentIdsIfNotAlready([equipmentId]);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
