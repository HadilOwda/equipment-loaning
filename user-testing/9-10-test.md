# Equipment Loaning System - User Testing Guide

Quick reference for informal single-person testing.

---

## Testing Scenarios

### Student Tasks

**S1 - Login**

- [x] Log in with Google OAuth and verify redirect to `/requests` page with request form visible

**S2 - Submit Equipment Request**

- [x] Select period, add ranked equipment preferences (Meta Quest 3 > Snap Spectacles > OpenBCI Galea), enter collateral description
- [x] Submit request, verify toast notification, and confirm the request appears in "Current Requests"

**S3 - Reorder Equipment Preferences**

- [x] Add multiple equipment choices, use up/down arrows to reorder
- [x] Verify rank labels update correctly, submit and confirm order saves

**S4 - View Request Status**

- [x] Find submitted request in "Current Requests" and interpret status badge (pending/approved/other)
- [x] Verify period name and creation date display correctly

**S5 - Remove Equipment Choice**

- [x] Add 2-3 equipment choices, use X button to remove one
- [x] Verify removal and automatic rank adjustment, submit with fewer choices

### Admin Tasks

**A1 - Add New Equipment Type**

- [x] Go to `/admin/inventory`, create new equipment type "Apple Vision Pro"
- [x] Verify type appears in Equipment Types table

**A2 - Add Individual Equipment Unit**

- [x] Go to `/admin/inventory`, create equipment with ID "MQ3-042", type "Meta Quest 3"
- [x] Add accessories (carrying case, extra battery) and notes (left controller scratch)
- [x] Verify equipment appears in Equipment table

**A3 - Create Hackathon Loaning Period**

- [x] Go to `/admin/periods`, create period "Immerse The Bay 2025" (Hackathon type, Nov 14-16, 2025
- [x] Enable "Accept new requests", select loanable equipment (5 Meta Quest 3, 3 Snap Spectacles)
- [x] Verify redirect to period detail page with correct info

**A4 - Manually Assign Equipment to Requests**

- [x] Go to period detail page, view requests, expand "Unassigned Requests"
- [x] Select equipment from dropdowns for each request (note user preference rank badges)
- [x] Save assignments, verify toast notification, reload to see in "Assigned Requests"

**A5 - Run Automatic Matching Algorithm**

- [x] Go to period requests page, run matching algorithm
- [x] Review proposed assignments (verify they respect rankings and availability)
- [x] Optionally adjust manually, save assignments, reload to verify

---

## Issues Found

**P0 - CRITICAL:** Blocks completion / causes data loss.
**P1 - HIGH:** Major usability problem.
**P2 - MEDIUM:** Frustration but workable.
**P3 - LOW:** Minor polish.

<!-- # format: Priority(P0/P1/P2/P3) - Scenario(S1/S2/...S5/A1/A2/.../A5) - Page(i.e. /admin or /requests) - Description -->
<!-- # example: P1 - A3 - /admin - Explaination of issue -->

---

P1 - A3 - /admin/periods/new - Unable to select time within period date

P2 - A3 - /admin/periods/f988b5a3-d618-4f52-a09c-6d9c9ae632e7 - Times on creation page vs times on landing page differ

P2 - S2 - /requests - Allows duplicate requests for the same application period.

P3 - S2 - /requests - Created should have a colon after it

P2 - A4 - admin/periods/f56109ca-fe16-4fe1-90fa-85725c2c9e7e/requests - Available Equipment module on bottom right not displaying.

FEATURE: The admin/periods/f988b5a3-d618-4f52-a09c-6d9c9ae632e7 Period Details Page should indicate which email an equipmeent was loaned to.

## Skip These (Not Implemented)

- Delete Equipment
- Admin Checkout Page (`/app/admin/checkout`)
- Request Detail Page (`/app/requests/[request_id]`)
- Update Request Status UI
- APPROVAL Period Workflow
- Edit Request After Submission
- Equipment Return Process
