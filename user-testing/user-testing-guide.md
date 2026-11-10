# Equipment Loaning System - User Testing Guide

Quick reference for informal single-person testing.

---

## Testing Scenarios

### Student Tasks

**S1 - Login**

- [ ] Log in with Google OAuth and verify redirect to `/requests` page with request form visible

**S2 - Submit Equipment Request**

- [ ] Select period, add ranked equipment preferences (Meta Quest 3 > Snap Spectacles > OpenBCI Galea), enter collateral description
- [ ] Submit request, verify toast notification, and confirm the request appears in "Current Requests"

**S3 - Reorder Equipment Preferences**

- [ ] Add multiple equipment choices, use up/down arrows to reorder
- [ ] Verify rank labels update correctly, submit and confirm order saves

**S4 - View Request Status**

- [ ] Find submitted request in "Current Requests" and interpret status badge (pending/approved/other)
- [ ] Verify period name and creation date display correctly

**S5 - Remove Equipment Choice**

- [ ] Add 2-3 equipment choices, use X button to remove one
- [ ] Verify removal and automatic rank adjustment, submit with fewer choices

### Admin Tasks

**A1 - Add New Equipment Type**

- [ ] Go to `/admin/inventory`, create new equipment type "Apple Vision Pro"
- [ ] Verify type appears in Equipment Types table

**A2 - Add Individual Equipment Unit**

- [ ] Go to `/admin/inventory`, create equipment with ID "MQ3-042", type "Meta Quest 3"
- [ ] Add accessories (carrying case, extra battery) and notes (left controller scratch)
- [ ] Verify equipment appears in Equipment table

**A3 - Create Hackathon Loaning Period**

- [ ] Go to `/admin/periods`, create period "Immerse The Bay 2025" (Hackathon type, Nov 14-16, 2025
- [ ] Enable "Accept new requests", select loanable equipment (5 Meta Quest 3, 3 Snap Spectacles)
- [ ] Verify redirect to period detail page with correct info

**A4 - Manually Assign Equipment to Requests**

- [ ] Go to period detail page, view requests, expand "Unassigned Requests"
- [ ] Select equipment from dropdowns for each request (note user preference rank badges)
- [ ] Save assignments, verify toast notification, reload to see in "Assigned Requests"

**A5 - Run Automatic Matching Algorithm**

- [ ] Go to period requests page, run matching algorithm
- [ ] Review proposed assignments (verify they respect rankings and availability)
- [ ] Optionally adjust manually, save assignments, reload to verify

---

## Issues Found

**P0 - CRITICAL:** Blocks completion / causes data loss.
**P1 - HIGH:** Major usability problem.
**P2 - MEDIUM:** Frustration but workable.
**P3 - LOW:** Minor polish.

<!-- # format: Priority(P0/P1/P2/P3) - Scenario(S1/S2/...S5/A1/A2/.../A5) - Page(i.e. /admin or /requests) - Description -->
<!-- # example: P1 - A3 - /admin - Explaination of issue -->

---

---

## Skip These (Not Implemented)

- Delete Equipment
- Admin Checkout Page (`/app/admin/checkout`)
- Request Detail Page (`/app/requests/[request_id]`)
- Update Request Status UI
- APPROVAL Period Workflow
- Edit Request After Submission
- Equipment Return Process
