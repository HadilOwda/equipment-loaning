#!/usr/bin/env bash
# Create roadmap issues (#1–#11). Run once after: gh auth login
set -euo pipefail

REPO="${GITHUB_REPO:-StanfordXR/equipment-loaning}"

echo "Creating milestones (ignore errors if they already exist)..."
gh api "repos/${REPO}/milestones" -f title='Hackathon polish' -f state='open' 2>/dev/null || true
gh api "repos/${REPO}/milestones" -f title='Year-round' -f state='open' 2>/dev/null || true
gh api "repos/${REPO}/milestones" -f title='Platform' -f state='open' 2>/dev/null || true

echo "Creating labels (ignore errors if they already exist)..."
for label in frontend amplify schema ops; do
  gh label create "$label" --repo "$REPO" --force 2>/dev/null || true
done

create_issue() {
  local title="$1"
  local milestone="$2"
  local labels="$3"
  local body="$4"
  gh issue create --repo "$REPO" --title "$title" --milestone "$milestone" --label "$labels" --body "$body"
}

echo "Creating issue 1..."
create_issue \
  "[#1] Refresh UI after mutations (router.refresh)" \
  "Hackathon polish" \
  "frontend" \
  "$(cat <<'EOF'
## Outcome
After create/update/assign flows, server-rendered lists update without a manual browser reload.

## Depends on
None

## Files
- `components/dialogs/crud-dialog.tsx` — optional `onSuccess` callback after successful submit
- `components/dialogs/create-dialog.tsx`, `components/dialogs/update-dialog.tsx` — wire `onSuccess`; remove reload copy in toasts
- `app/requests/components/new-request.tsx` — `router.refresh()` on successful submit
- `app/admin/inventory/dialogs/create-equipment-dialog.tsx`, `create-equipment-type-dialog.tsx`
- `app/admin/periods/[period_id]/components/update-loanable-equipment-dialog.tsx`
- `app/admin/periods/[period_id]/requests/unassigned-requests.tsx` — refresh + clear `newAssignments` on save
- Optional: `app/hooks/use-refresh-after-mutation.ts`
- `user-testing/user-testing-guide.md` — update S2/A4 (no manual reload)

## Acceptance criteria
- [ ] Submitting a new request shows it under My Requests without reload
- [ ] Inventory create dialogs show new rows without reload
- [ ] Save Assignments updates assigned/unassigned sections without reload
- [ ] Loanable equipment update reflects on period detail without reload
- [ ] Success toasts no longer say "reload page"

## Test plan
- [ ] Student S2 from user-testing guide
- [ ] Admin A1, A2, A4
EOF
)"

echo "Creating issue 2..."
create_issue \
  "[#2] Edge cases: assignment, loanable equipment, closed periods" \
  "Hackathon polish" \
  "frontend,amplify" \
  "$(cat <<'EOF'
## Outcome
Prevent invalid states during hackathon ops: double assignment, removing assigned loanable gear, submitting to closed periods.

## Depends on
#1 (recommended for easier QA)

## Files

### 2a — Double assignment
- **New** `app/utils/validate-assignments.ts` + `app/utils/validate-assignments.test.ts`
- `app/admin/periods/[period_id]/requests/unassigned-requests.tsx` — validate before save; user-facing errors
- Optional hardening: `amplify/data/resource.ts`, **new** `amplify/functions/assign-equipment/`, `amplify/backend.ts`

### 2b — Remove loanable equipment
- `app/admin/periods/[period_id]/period-details-config.ts` — include assignment on loanable equipment
- `app/admin/periods/[period_id]/page.tsx` — pass guard data to dialog
- `app/admin/periods/[period_id]/components/update-loanable-equipment-dialog.tsx` — block remove if assigned/checked out
- Optional: `app/admin/periods/components/loanable-equipment-checklist.tsx` — disable unsafe removals

### 2c — Period closed mid-request
- `app/requests/components/new-request.tsx` — re-validate period on submit (`acceptingRequests`, `endDateTime`)
- Optional: custom mutation in `amplify/data/resource.ts`

## Acceptance criteria
- [ ] **2a:** Cannot save two requests to the same equipment in one batch; cannot assign equipment already assigned
- [ ] **2b:** Cannot remove loanable equipment that has an active assignment (clear error)
- [ ] **2c:** Submit fails with toast if period stopped accepting or ended (stale tab)
- [ ] Unit tests for validate-assignments

## Test plan
- [ ] Manual: two admins saving same equipment (one should fail after 2a)
- [ ] Manual: uncheck assigned equipment in loanable dialog
- [ ] Manual: leave form open, admin closes period, submit
EOF
)"

echo "Creating issue 3..."
create_issue \
  "[#3] Admin deny request flow" \
  "Hackathon polish" \
  "frontend,amplify" \
  "$(cat <<'EOF'
## Outcome
Admins can deny a request; students see Denied status. Uses existing `RequestStatus.DENIED`.

## Depends on
#1 recommended

## Files
- **New** `app/admin/periods/[period_id]/requests/deny-request-button.tsx` (or inline in list components)
- `app/admin/periods/[period_id]/requests/unassigned-requests.tsx`
- `app/admin/periods/[period_id]/requests/assigned-requests.tsx` — block deny if checked out
- `app/requests/components/current-requests.tsx` — denied without assignment shows Denied
- `app/requests/[request_id]/components/request-attributes.tsx` — verify display
- `user-testing/user-testing-guide.md` — add A6 Deny request
- Optional: hook into email issue (#7) later

## Acceptance criteria
- [ ] Admin can deny unassigned request; `status: DENIED`, no assignment
- [ ] Admin cannot deny checked-out request (clear message)
- [ ] Student badge/detail shows Denied
- [ ] Refresh behavior consistent with #1

## Test plan
- [ ] Deny pending request; confirm student view
- [ ] Attempt deny on checked-out request
EOF
)"

echo "Creating issue 4..."
create_issue \
  "[#4] APPROVAL flow (general / year-round loaning)" \
  "Year-round" \
  "frontend,amplify,schema" \
  "$(cat <<'EOF'
## Outcome
`PeriodType.APPROVAL` works end-to-end: student submit + admin review/assign (no matchmaker).

## Depends on
#2a assignment validation; product spec for APPROVAL UX (ranked vs single/multi select)

## Files
- `amplify/data/constants.ts` — extend statuses if needed (e.g. PENDING/APPROVED)
- `app/requests/components/new-request.tsx` — replace "not supported" alert with APPROVAL form
- **New** `app/requests/components/equipment-type-list-approval.tsx`
- `app/requests/[request_id]/components/request-attributes.tsx` — hide ranks for APPROVAL
- `app/requests/period-config.ts`, `request-details-config.ts` — include `periodType` where needed
- `app/admin/periods/[period_id]/requests/page.tsx` — render approval UI instead of placeholder
- **New** `app/admin/periods/[period_id]/requests/approval-requests.tsx`
- Keep `requests.tsx` / `generate-auto-match.ts` for MATCH only
- `user-testing/user-testing-guide.md` — new scenarios

## Acceptance criteria
- [ ] Student can submit request for APPROVAL period
- [ ] Admin can view, assign equipment, deny APPROVAL requests
- [ ] MATCH hackathon flow unchanged
- [ ] Docs updated

## Test plan
- [ ] Create APPROVAL period; full student + admin path
- [ ] Regression: MATCH period still uses matchmaker
EOF
)"

echo "Creating issue 5..."
create_issue \
  "[#5] Update/delete: inventory and periods" \
  "Year-round" \
  "frontend,amplify" \
  "$(cat <<'EOF'
## Outcome
Admins can update and delete equipment types, equipment units, and periods—with guards when in use.

## Depends on
#1

## Files
- **New** `components/dialogs/delete-dialog.tsx`
- **New** `app/admin/inventory/dialogs/update-equipment-type-dialog.tsx`, `delete-equipment-type-dialog.tsx`
- **New** `app/admin/inventory/dialogs/update-equipment-dialog.tsx`, `delete-equipment-dialog.tsx`
- `app/admin/inventory/tables/equipment-type-config.tsx`, `equipment-config.tsx` — actions menu
- `app/admin/inventory/page.tsx` — selection sets for delete guards
- **New** `app/admin/periods/[period_id]/components/update-period-dialog.tsx`, `delete-period-dialog.tsx`
- `app/admin/periods/[period_id]/page.tsx`, `period-details-config.ts`

## Acceptance criteria
- [ ] **5a:** Update equipment type name; delete type only if no units
- [ ] **5b:** Update notes/accessories; delete unit only if not assigned / safe per rules
- [ ] **5c:** Update period metadata; delete period only if no requests (cascade PeriodEquipment)
- [ ] All mutations refresh UI (#1)

## Test plan
- [ ] Update/delete happy paths
- [ ] Block delete type with equipment; block delete assigned unit; block delete period with requests
EOF
)"

echo "Creating issue 6..."
create_issue \
  "[#6] Student cancel/edit request before assignment" \
  "Year-round" \
  "frontend,amplify,schema" \
  "$(cat <<'EOF'
## Outcome
Students can edit collateral/equipment choices or cancel a request until assigned (and while period accepts).

## Depends on
#1; #4 if APPROVAL edit rules differ

## Files
- `amplify/data/resource.ts` — **owner** `update`/`delete` on `Request` and `EquipmentTypeRequest` (required)
- **New** `app/requests/[request_id]/components/edit-request-form.tsx`
- **New** `app/requests/[request_id]/components/cancel-request-button.tsx`
- `app/requests/[request_id]/page.tsx`, `request-details-config.ts`
- `app/requests/components/current-requests.tsx` — optional Edit link

## Acceptance criteria
- [ ] Edit allowed only when: no assignment, not returned, not denied, period accepting
- [ ] Cancel deletes EquipmentTypeRequests then Request
- [ ] MATCH: ranks update correctly; APPROVAL: uses approval picker when #4 done
- [ ] Sandbox redeploy after schema auth change

## Test plan
- [ ] Edit pending request; cancel pending request
- [ ] Block edit after admin assigns
EOF
)"

echo "Creating issue 7..."
create_issue \
  "[#7] Email notifications (assignment, checkout, deny, return)" \
  "Platform" \
  "amplify,ops" \
  "$(cat <<'EOF'
## Outcome
Users receive email on key lifecycle events (start with assignment + deny; extend to checkout/return).

## Depends on
#3 for deny emails; assignment save flow for assignment emails

## Files
- **New** `amplify/functions/send-loaning-email/handler.ts` (+ resource wiring)
- `amplify/functions/resource.ts`, `amplify/backend.ts` — SES IAM, register function
- `amplify/data/resource.ts` — custom mutation(s) OR DynamoDB stream + Lambda (document choice)
- `app/admin/periods/[period_id]/requests/unassigned-requests.tsx` — trigger after save
- `app/admin/checkout/components/equipment-view.tsx` — checkout/return
- Deny UI from #3
- Optional: extend `get-user-display-names` or new helper for recipient email
- `README.md` — SES / verified domain setup

## Acceptance criteria
- [ ] Assignment email sent when admin saves assignments
- [ ] Deny email sent when admin denies
- [ ] (Stretch) Checkout and return emails
- [ ] Works in sandbox with configured SES

## Test plan
- [ ] Save assignment; verify inbox
- [ ] Deny request; verify inbox
EOF
)"

echo "Creating issue 8..."
create_issue \
  "[#8] Owner-scoped request list (fix Current Requests)" \
  "Hackathon polish" \
  "frontend,amplify" \
  "$(cat <<'EOF'
## Outcome
My Requests loads only the current user's requests—no list-all-then-filter.

## Depends on
None (pairs well with #1)

## Files
- `app/requests/components/current-requests.tsx` — try `filter: { owner: { eq: username } }` on list
- If unsupported: **new** `amplify/functions/list-my-requests/`, `amplify/data/resource.ts` custom query, `amplify/backend.ts`

## Acceptance criteria
- [ ] Student sees only own requests
- [ ] No regression in request detail links
- [ ] Document approach in PR description

## Test plan
- [ ] Two test users; each sees only their requests
EOF
)"

echo "Creating issue 9..."
create_issue \
  "[#9] CI: lint, test, build (+ optional E2E)" \
  "Platform" \
  "ops" \
  "$(cat <<'EOF'
## Outcome
GitHub Actions runs on PRs: lint, jest, next build.

## Depends on
None

## Files
- **New** `.github/workflows/ci.yml`
- **New** `amplify_outputs.example.json` (committed stub for CI)
- `.gitignore` — keep real `amplify_outputs.json` ignored; CI copies example before build
- `package.json` / `jest.config.js` — ensure CI-friendly test command

## Acceptance criteria
- [ ] PR workflow runs lint + test + build green on default branch
- [ ] Document how devs generate real `amplify_outputs.json` locally
- [ ] (Stretch) Playwright E2E against staging — checkbox only

## Test plan
- [ ] Open PR; confirm checks pass
EOF
)"

echo "Done. Listing open issues with [# in title:"
gh issue list --repo "$REPO" --search "in:title [#" --limit 20
