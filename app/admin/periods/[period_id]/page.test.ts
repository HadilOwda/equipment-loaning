import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminPeriodPage from './page';

const mockGetPeriod = jest.fn<(...args: unknown[]) => Promise<{ data: unknown }>>();
const mockDialog = jest.fn<(props: { initialLoanableEquipment: string[]; assignedEquipmentIds: string[] }) => null>();

jest.mock('@/app/utils/generate-ssr-client', () => ({
    __esModule: true,
    default: () => ({ models: { Period: { get: mockGetPeriod } } })
}));
jest.mock('./components/update-loanable-equipment-dialog', () => ({
    __esModule: true,
    default: (props: Parameters<typeof mockDialog>[0]) => mockDialog(props)
}));
jest.mock('./components/update-period-dialog', () => ({ __esModule: true, default: () => null }));
jest.mock('./components/delete-period-dialog', () => ({ __esModule: true, default: () => null }));

describe('period equipment details', () => {
    const period = {
        id: 'period-1', name: 'Test period', periodType: 'MATCH', acceptingRequests: true,
        startDateTime: '2026-11-01T00:00:00Z', endDateTime: '2026-11-05T00:00:00Z',
        requests: [],
        loanableEquipment: [
            { id: 'assigned', assignment: { id: 'request-1', status: null } },
            { id: 'checked-out', assignment: { id: 'request-2', status: 'CHECKED_OUT' } },
            { id: 'available', assignment: null }
        ].map(equipment => ({ equipment: { ...equipment, equipmentType: { name: 'Camera' } } }))
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPeriod.mockResolvedValue({ data: period });
        mockDialog.mockReturnValue(null);
    });

    test('loads assignment status and passes every currently assigned equipment ID to the dialog', async () => {
        renderToStaticMarkup(await AdminPeriodPage({ params: { period_id: period.id } }));
        expect(mockGetPeriod).toHaveBeenCalledWith({ id: period.id }, {
            selectionSet: expect.arrayContaining(['loanableEquipment.equipment.assignment.status'])
        });
        expect(mockDialog).toHaveBeenCalledWith(expect.objectContaining({
            initialLoanableEquipment: ['assigned', 'checked-out', 'available'],
            assignedEquipmentIds: ['assigned', 'checked-out']
        }));
    });

    test('distinguishes assigned, checked-out, and available equipment in the table', async () => {
        const html = renderToStaticMarkup(await AdminPeriodPage({ params: { period_id: period.id } }));
        expect(html).toContain('>Assigned</div>');
        expect(html).toContain('>Checked Out</div>');
        expect(html).toContain('>Available</div>');
    });
});
