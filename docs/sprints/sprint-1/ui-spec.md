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