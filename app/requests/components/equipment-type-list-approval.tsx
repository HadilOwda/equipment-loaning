
import { Period } from '../period-config';
import InputLabel from '@/components/primitives/interactions/input-label';
import { EquipmentTypeIdentifier } from '../types';
import CheckboxWithDescription from '@/components/primitives/interactions/checkbox-with-description';


interface EquipmentTypeListApprovalProps {
    period: Period;
    selectedEquipmentTypeIds: string[];
    setSelectedEquipmentTypeIds: (val: string[]) => void;
}

export default function EquipmentTypeListApproval({ period, selectedEquipmentTypeIds, setSelectedEquipmentTypeIds }: EquipmentTypeListApprovalProps) {
    let loanableEquipmentTypes: EquipmentTypeIdentifier[] = [];
    period.loanableEquipment
        .map(l => l.equipment)
        .map(e => {
            if (!loanableEquipmentTypes.find(a => a.equipmentTypeId == e.equipmentType.id)) {
                loanableEquipmentTypes.push({
                    equipmentTypeId: e.equipmentType.id,
                    equipmentTypeName: e.equipmentType.name
                })
            }
        });

    return (
        <InputLabel
            label='Equipment'
            description={`
                Select every type of equipment you would be happy to borrow. You will only
                receive one piece of equipment; an administrator will review your request.
            `}
        >
            <div className='flex flex-col gap-3'>
                {loanableEquipmentTypes.map(({ equipmentTypeId, equipmentTypeName }) =>
                    <CheckboxWithDescription
                        key={equipmentTypeId}
                        inputID={`new-request-equipment-type-${equipmentTypeId}`}
                        label={equipmentTypeName}
                        value={selectedEquipmentTypeIds.includes(equipmentTypeId)}
                        onChange={(val) => {
                            if (val === true) {
                                setSelectedEquipmentTypeIds([...selectedEquipmentTypeIds, equipmentTypeId]);
                            } else {
                                setSelectedEquipmentTypeIds(selectedEquipmentTypeIds.filter(id => id != equipmentTypeId));
                            }
                        }}
                    />
                )}
            </div>
        </InputLabel>
    );
}
