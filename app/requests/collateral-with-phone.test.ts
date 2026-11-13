import { describe, expect, it } from '@jest/globals';
import { composeCollateral, parseCollateral } from './collateral-with-phone';

describe('composeCollateral', () => {
    it('joins collateral and phone with a visible label', () => {
        expect(composeCollateral('Stanford ID card', '+1 650 555 0123'))
            .toBe('Stanford ID card | Phone: +1 650 555 0123');
    });

    it('trims both parts', () => {
        expect(composeCollateral('  Passport ', ' 555-0100  ')).toBe('Passport | Phone: 555-0100');
    });

    it('removes the separator character from user input', () => {
        expect(composeCollateral('ID | Phone: fake', '1 | 2')).toBe('ID / Phone: fake | Phone: 1 / 2');
    });
});

describe('parseCollateral', () => {
    it('round-trips what composeCollateral produced', () => {
        const stored = composeCollateral('Driver license', '+44 7700 900123');
        expect(parseCollateral(stored)).toEqual({ collateral: 'Driver license', phone: '+44 7700 900123' });
    });

    it('round-trips input that tries to imitate the separator', () => {
        const stored = composeCollateral('ID | Phone: fake', '555');
        expect(parseCollateral(stored)).toEqual({ collateral: 'ID / Phone: fake', phone: '555' });
    });

    it('treats older requests without a phone as collateral only', () => {
        expect(parseCollateral("Jane's drivers license")).toEqual({ collateral: "Jane's drivers license", phone: '' });
    });
});
