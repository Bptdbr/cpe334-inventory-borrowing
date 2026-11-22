# UI Specification, Sprint 1 domain screens

**Related Issue:** #14
**Features:** F-03, F-04, F-05, F-06
**Version:** 1.0 (written before implementation)
**Last updated:** 2026-11-06

Reuses the shell of Issue #13 (`apiClient`, `AuthContext`, `LoadingState`, `EmptyState`, `ErrorState`). The UI never decides access; the API does (SDS 8, 11).

## 1. Screens

### 1.1 Catalog (`/items`), F-03, F-04
- Loads `GET /api/items` (loading, empty "No items in the catalog", error with Retry).
- Table columns: Asset tag, Name, Description, Status (text badge `AVAILABLE` or `ON_LOAN`).
- Borrower: each row has a **Request** button, enabled only when status is `AVAILABLE`. While pending: button disabled with "Requesting...". On 201: success message "Request submitted" and the list refreshes. On 409: the server message is shown and the list refreshes.
- Custodian: no Request button; an **Add item** form (asset tag, name, description) with field errors on 422 and the message "An item with this asset tag already exists." on 409.

### 1.2 My requests and loans (`/my`), F-06
- Loads `GET /api/loans/mine` and `GET /api/requests/mine` together.
- Section "My Active Loans": asset tag, item name, checked-out date.
- Section "My Requests": asset tag, item name, status badge (`PENDING`, `FULFILLED`), created date.
- Empty: "No requests or loans yet". Error: message with Retry.

### 1.3 Requests to process (`/manage/requests`), F-05, F-06
- Loads `GET /api/requests`. Columns: borrower display name, asset tag, item name, status badge, created date.
- `PENDING` rows have a **Check out** button, disabled with "Checking out..." while pending.
- On 201: success message "Checkout recorded" and the list refreshes. On 409 `REQUEST_NOT_PENDING`: "This request has already been processed". On 409 `ITEM_UNAVAILABLE`: "This item is currently unavailable". On 404: "Request not found". The list refreshes after any 409.
- Empty: "No requests to process".

### 1.4 Active loans (`/manage/loans`), F-06
- Loads `GET /api/loans`. Columns: asset tag, item name, borrower display name, checked-out date, status `ACTIVE`.
- Empty: "No active loans".


## 2. Test selectors (`data-testid`)

| Element | `data-testid` |
|---|---|
| Catalog table, row | `catalog-table`, `item-row-<assetTag>` |
| Item status badge | `item-status-<assetTag>` |
| Request button | `request-button-<assetTag>` |
| Success message / feedback banner | `success-message`, `feedback-error` |
| Add item form fields, submit | `add-item-asset-tag`, `add-item-name`, `add-item-description`, `add-item-submit` |
| My loans / my requests rows | `my-loan-row-<assetTag>`, `my-request-row-<assetTag>` |
| Request status badge | `request-status-<assetTag>` |
| Manage requests row | `manage-request-row-<assetTag>` |
| Check out button | `checkout-button-<assetTag>` |
| Manage loans row | `manage-loan-row-<assetTag>` |

Existing shell selectors are reused: `catalog-page`, `my-requests-page`, `manage-requests-page`, `manage-loans-page`, `forbidden-screen`, `error-state`, `logout-button`.
Status values are displayed as text, never by colour alone (SDS 11.5).

## 3. E2E environment and data

| Aspect | Decision |
|---|---|
| Database | `inventory_test`, never `inventory_dev`. The E2E backend is started by `npm run dev:e2e --workspace=backend`, which loads `.env.test`. |
| Accounts | Seeded accounts `borrower1`, `borrower2`, `custodian1`, `custodian2`. The password is read from the environment, never hardcoded in my specs. |
| Data per test | Each test creates its own item (asset tag `E2E-<random>`, managed by `custodian1`) through `POST /api/items`, and its own request through `POST /api/requests`. Tests never modify the seeded items `EQ-00x`. |
| Cleanup | `npm run e2e:cleanup --workspace=backend` deletes loans, requests and items whose asset tag starts with `E2E-`. |
| Execution | One worker, sequential (already configured). A server already running on port 3000 against another database must be stopped first. |

## 4. E2E scenarios

| Test | AC | Role | Steps | Expected |
|---|---|---|---|---|
| TEST-73 | AC-46 | Custodian, then borrower | Fixture: `E2E-` item with a PENDING request by `borrower1`. Custodian logs in, opens `/manage/requests`, clicks Check out on the row | Success message "Checkout recorded"; row status becomes `FULFILLED` with no Check out button; the loan is listed in `/manage/loans`; `borrower1` logs in and sees the loan in `/my` |
| TEST-87 | AC-55 | Borrower | `borrower1` logs in, opens `/my` (loan and request visible), then opens `/manage/requests` | `/my` shows the data with status badges; `/manage/requests` shows the 403 forbidden screen |
| TEST-88 | AC-55 | Custodian | Fixture: a request on an item managed by `custodian2`. `custodian1` opens `/manage/requests` and `/manage/loans`, then `/my` | Only `custodian1` items appear; the `custodian2` item is absent; `/my` shows the 403 forbidden screen |
| TEST-89 | AC-30, AC-29 | Borrower | `borrower1` opens `/items`, clicks Request on an `E2E-` item; the same item is then set ON_LOAN by the fixture and the page is reloaded | First click: "Request submitted" and the request appears in `/my`. After reload: the Request button is disabled and the status text is `ON_LOAN` |
| TEST-90 | AC-40, AC-41 | Custodian | Fixture: PENDING request. The page is loaded, then the fixture fulfils the same request through the API. Custodian clicks Check out | Banner "This request has already been processed" (`feedback-error`); the list refreshes and the row shows `FULFILLED` |

TEST-89 and TEST-90 are UI additions to the contracts of F-04 and F-05. They are recorded here and in the traceability matrix (gap G-11), not by silently editing the merged contracts.

## 5. Messages

| Situation | Message |
|---|---|
| Checkout 201 | Checkout recorded |
| Request 201 | Request submitted |
| 409 `REQUEST_NOT_PENDING` | This request has already been processed |
| 409 `ITEM_UNAVAILABLE` | This item is currently unavailable |
| 409 `DUPLICATE_PENDING_REQUEST` | You already have a pending request for this item. |
| 409 `DUPLICATE_ASSET_TAG` | An item with this asset tag already exists. |
| 404 | Request not found |
| 422 | Field messages from the server `details` (array of `{ field, message }`) |
| 401, 403, 500, network | Handled by the shell (`apiClient`, `ErrorState`) |

## 6. Definition of Done and history

- [ ] TEST-73, 87, 88, 89, 90 written before the UI work, observed failing, then passing.
- [ ] All pages show distinct loading, empty and error states (NFR-07).
- [ ] No test uses `inventory_dev`; no secret in Git.
- [ ] Results with real counts; failed or skipped tests reported.

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-06 | Initial UI specification before implementation | Baptiste |