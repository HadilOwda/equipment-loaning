// A request stores one text field, `collateralDescription`. To collect a phone number without
// a schema change, the collateral and phone are saved together in that field, e.g.
//   "Stanford ID card | Phone: +1 650 555 0123"
// Everything that shows the collateral (including admin Checkout) therefore shows the phone too.

const PHONE_MARKER = ' | Phone: ';

// The marker character is replaced so user text can never be mistaken for the separator
const clean = (text: string) => text.replace(/\|/g, '/').trim();

export function composeCollateral(collateral: string, phone: string): string {
    return `${clean(collateral)}${PHONE_MARKER}${clean(phone)}`;
}

export function parseCollateral(stored: string): { collateral: string; phone: string } {
    const index = stored.lastIndexOf(PHONE_MARKER);

    // Requests created before the phone field existed have no marker
    if (index === -1) {
        return { collateral: stored, phone: '' };
    }

    return {
        collateral: stored.slice(0, index),
        phone: stored.slice(index + PHONE_MARKER.length)
    };
}
