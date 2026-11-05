# Feature Contract F-04: Borrow Request

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026  
**Related Issue:** #7  
**Feature:** F-04 Borrow request  
**Requirements:** FR-06, BR-02 (request side), BR-06 (supports NFR-01, NFR-05, NFR-07, NFR-08)  
**Decisions:** D-01, D-02, D-05, D-06, D-07, D-15  
**Version:** 1.0 (written before implementation)  
**Last updated:** 2026-11-05  
**Author:** Léo (Student B, ID 69540460045)  

The detailed design is in `docs/system-sds.md` (sections 5.2, 5.3, 6.2, 8.2, 10.3 and 11). This contract defines the observable behavior, API specifications, acceptance criteria (AC-29 to AC-36), and the software test specification (TEST-46 to TEST-57) for F-04.

---

## 1. Objective and scope

Feature F-04 allows an authenticated borrower to request one available equipment item from the catalog, producing a `PENDING` request. In Sprint 1, requests do not undergo approval (D-02, D-15); a pending request is immediately eligible for checkout by the managing custodian (F-05).

| In scope | Out of scope |
|---|---|
| Borrower submits a borrow request for one item (FR-06) | Request approval or rejection by custodian (FR-19, Sprint 2) |
| Rejection if the requested item is not `AVAILABLE` (BR-02) | Borrower cancels their own pending request (FR-12, Sprint 2) |
| Rejection if the borrower already has a `PENDING` request for that item (BR-06) | Checking out or fulfilling the request (F-05, Issue #8) |
| Partial unique database index preventing concurrent duplicate pending requests | Multi-item basket or cart borrowing |
| Role restriction: Borrowers only (Custodians receive 403) | Specifying a return due date during request (FR-13, Sprint 2) |
| Identity enforcement: `borrower_id` taken solely from authenticated token | Email notifications upon request creation |

Dependencies: F-01 (Authentication) and F-02 (Authorization) provide authentication and role verification. F-03 (Catalog) provides the item records. F-05 (Checkout) and F-06 (Consultation) consume the requests created here.

---

## 2. Workflow

1. A borrower views the catalog on `/items` (`GET /api/items`) and selects an item with status `AVAILABLE`.
2. The borrower submits a request by calling `POST /api/requests` with `{ itemId: "<uuid>" }`.
3. The auth middleware verifies the JWT Bearer token (401 if missing, invalid, or expired).
4. The role middleware ensures the caller has the `BORROWER` role. Custodians receive 403 `FORBIDDEN_ROLE`.
5. The route layer validates the payload with Zod: `itemId` must be a valid UUID (422 `VALIDATION_ERROR` if invalid).
6. The request service loads the item from PostgreSQL:
   - If the item does not exist, returns 404 `NOT_FOUND` (no information leak).
   - If the item status is NOT `AVAILABLE` (e.g., `ON_LOAN`), returns 409 `ITEM_UNAVAILABLE` (BR-02).
7. The service checks whether the borrower already has a request for this item with status `PENDING`:
   - If an active pending request exists, returns 409 `DUPLICATE_PENDING_REQUEST` (BR-06).
8. The service inserts a new row into `loan_requests`:
   - `id`: newly generated UUID.
   - `item_id`: target item UUID.
   - `borrower_id`: authenticated user's ID extracted from token (caller-supplied IDs are ignored).
   - `status`: `PENDING`.
   - `created_at`: current UTC timestamp.
   - `fulfilled_at`: `NULL`.
   - Concurrency safety: guarded by the database partial unique index on `loan_requests(item_id, borrower_id) WHERE status = 'PENDING'`. A race condition throwing Prisma `P2002` maps cleanly to 409 `DUPLICATE_PENDING_REQUEST`.
9. The API returns 201 Created with the serialized request object.

---

## 3. Business rules, validation and boundaries

| Rule | Detail |
|---|---|
| Available item only (BR-02) | Only an item currently in `AVAILABLE` status can be requested. If the item is `ON_LOAN`, the API rejects the request with status 409 and code `ITEM_UNAVAILABLE`. No database state is changed. |
| No duplicate pending request (BR-06) | A borrower cannot have more than one `PENDING` request for the same item at any given time. An attempt to create a second pending request returns 409 `DUPLICATE_PENDING_REQUEST`. |
| Multi-borrower concurrency (D-05) | Two distinct borrowers **can** both submit a `PENDING` request for the same available item. Both requests are valid and pending until one is checked out in F-05. |
| Role restriction (BR-03, F-02) | Only users with role `BORROWER` can create borrow requests. Custodians receive 403 `FORBIDDEN_ROLE`. |
| Identity enforcement (NFR-01, AC-15) | The `borrower_id` is always extracted from the authenticated JWT session. Any `borrowerId` or `userId` in the request body is discarded. |
| Unknown item (D-07) | Requesting an item ID that does not exist in the database returns 404 `NOT_FOUND`. |
| Malformed input | Request bodies missing `itemId` or passing a non-UUID string return 422 `VALIDATION_ERROR`. |

---

## 4. Data

F-04 operates on the `loan_requests` table and reads from `items` and `users`.

### `loan_requests` schema summary
- `id`: UUID, primary key, default `gen_random_uuid()`.
- `item_id`: UUID, NOT NULL, FK → `items(id)` ON DELETE RESTRICT.
- `borrower_id`: UUID, NOT NULL, FK → `users(id)` ON DELETE RESTRICT.
- `status`: ENUM `RequestStatus` (`PENDING`, `FULFILLED`), NOT NULL, default `PENDING`.
- `created_at`: TIMESTAMPTZ, NOT NULL, default `now()`.
- `fulfilled_at`: TIMESTAMPTZ, NULL.

### Database constraints protecting F-04
1. **Partial unique index on pending requests (BR-06):**
   ```sql
   CREATE UNIQUE INDEX idx_loan_requests_pending_unique 
   ON loan_requests(item_id, borrower_id) 
   WHERE status = 'PENDING';
   ```
   This raw-SQL index ensures that even under concurrent HTTP requests, PostgreSQL rejects a duplicate pending request at transaction level.

---

## 5. API

Error body follows the standard format: `{ "error": { "code": "...", "message": "..." } }`.

### 5.1 POST /api/requests

Submits a new equipment borrow request.

**Headers:** `Authorization: Bearer <token>` (Required, Borrower role)  
**Request body:**

```json
{
  "itemId": "a0000000-0000-0000-0000-000000000001"
}
```

| Outcome | Status | Code | Message / Body |
|---|---|---|---|
| Created | 201 | - | `{ "id": "<uuid>", "itemId": "<uuid>", "borrowerId": "<uuid>", "status": "PENDING", "createdAt": "<ISO-8601>", "fulfilledAt": null }` |
| Missing/invalid token | 401 | `UNAUTHENTICATED` | "Authentication required" |
| Caller is CUSTODIAN | 403 | `FORBIDDEN_ROLE` | "Borrower role required" |
| Item does not exist | 404 | `NOT_FOUND` | "Item not found" |
| Item is not `AVAILABLE` | 409 | `ITEM_UNAVAILABLE` | "This item is not available" |
| Borrower already has PENDING request for item | 409 | `DUPLICATE_PENDING_REQUEST` | "You already have a pending request for this item" |
| Missing or malformed `itemId` | 422 | `VALIDATION_ERROR` | Validation error with details array |

---

## 6. UI

| Screen | Behavior |
|---|---|
| Catalog screen (`/items`) | For each item with status `AVAILABLE`, a logged-in borrower sees a visible **Request** action button. For items with status `ON_LOAN`, the button is disabled or replaced with an "Unavailable" badge. Logged-in custodians do not see a "Request" button. |
| Submitting request | Clicking **Request** disables the button and displays an inline spinner (NFR-07, prevents rapid double submit). |
| Success feedback | On 201: button updates to "Requested" or a success notification is shown; user can navigate to `/my` to view the pending request. |
| Error feedback | On 409 `ITEM_UNAVAILABLE`: banner displays "This item is currently unavailable". On 409 `DUPLICATE_PENDING_REQUEST`: banner displays "You already have a pending request for this item". On 404 or 500: clear error state with retry. |

---

## 7. Permissions

| Operation | Anonymous | Borrower | Custodian | Scope / Notes |
|---|---|---|---|---|
| `POST /api/requests` | 401 | Allowed | 403 | Borrower is caller; cannot request on behalf of others |

---

## 8. Acceptance criteria

| AC | Requirement | Expected observable outcome |
|---|---|---|
| **AC-29** | FR-06 | An authenticated borrower calling `POST /api/requests` with the UUID of an `AVAILABLE` item creates a request record with status `PENDING`, `borrowerId` set to the caller, and receives 201 Created. |
| **AC-30** | BR-02 | Calling `POST /api/requests` for an item whose status is `ON_LOAN` returns 409 `ITEM_UNAVAILABLE` and creates no record. |
| **AC-31** | BR-06 | An authenticated borrower calling `POST /api/requests` for an item for which they already have a `PENDING` request receives 409 `DUPLICATE_PENDING_REQUEST` and creates no duplicate record. |
| **AC-32** | BR-06, D-05 | Two different borrowers submitting a request for the same `AVAILABLE` item both succeed (both receive 201 with status `PENDING`). |
| **AC-33** | BR-03, NFR-01 | A custodian calling `POST /api/requests` receives 403 `FORBIDDEN_ROLE` and no request is created. |
| **AC-34** | FR-06 | Calling `POST /api/requests` with a valid UUID that does not exist in the database returns 404 `NOT_FOUND`. |
| **AC-35** | FR-06 | Calling `POST /api/requests` with a missing `itemId` or an invalid UUID format (e.g. `"not-a-uuid"`) returns 422 `VALIDATION_ERROR`. |
| **AC-36** | FR-06, NFR-07 | In the UI, a borrower can click "Request" on an available item, sees an in-flight loading state, receives a confirmation on success, and sees plain-language errors on 409 conflicts. Custodians never see a "Request" button. |

---

## 9. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-46** | AC-29 | Integration (API + DB) | Seeded database, `borrower1` logged in, item `EQ-002` is `AVAILABLE` | POST `/api/requests` with `{ itemId: "<id of EQ-002>" }` | 201 Created; status is `PENDING`, `borrowerId` equals `borrower1` id; DB row exists in `loan_requests` |
| **TEST-47** | AC-29, NFR-01 | Integration (API) | Logged-in `borrower1` | POST `/api/requests` `{ itemId: "<id>", borrowerId: "<id of borrower2>" }` | 201 Created; `borrowerId` in response and DB is `borrower1` (caller id enforced) |
| **TEST-48** | AC-30 | Integration (API + DB) | Seeded item `EQ-001` is `ON_LOAN`, `borrower2` logged in | POST `/api/requests` with `itemId` of `EQ-001` | 409 `ITEM_UNAVAILABLE`; no new row in `loan_requests` |
| **TEST-49** | AC-31 | Integration (API + DB) | `borrower1` already has a `PENDING` request for `EQ-002` | `borrower1` calls POST `/api/requests` with `itemId` of `EQ-002` again | 409 `DUPLICATE_PENDING_REQUEST`; count of requests for `EQ-002` remains 1 |
| **TEST-50** | AC-31 | Integration (DB) | Row exists with `(item_id, borrower_id, 'PENDING')` | Direct SQL / Prisma INSERT of duplicate row with status `PENDING` | Unique constraint violation (`P2002` or Postgres error 23505) thrown |
| **TEST-51** | AC-32 | Integration (API + DB) | Item `EQ-003` is `AVAILABLE`, `borrower1` has `PENDING` request on it | Logged-in `borrower2` calls POST `/api/requests` on `EQ-003` | 201 Created; two distinct `PENDING` requests exist for `EQ-003` with different borrower IDs |
| **TEST-52** | AC-33 | Integration (API) | Logged-in custodian | POST `/api/requests` with valid `itemId` | 403 `FORBIDDEN_ROLE`; no request created |
| **TEST-53** | AC-34 | Integration (API) | Logged-in borrower | POST `/api/requests` with random unassigned UUID | 404 `NOT_FOUND` |
| **TEST-54** | AC-35 | Integration (API), boundary | Logged-in borrower | POST `/api/requests` with `{ itemId: "invalid-uuid-123" }` | 422 `VALIDATION_ERROR` |
| **TEST-55** | AC-35 | Integration (API), boundary | Logged-in borrower | POST `/api/requests` with `{}` or `{ itemId: "" }` | 422 `VALIDATION_ERROR` |
| **TEST-56** | AC-29, NFR-01 | Integration (API) | No authorization token | POST `/api/requests` with valid `itemId` | 401 `UNAUTHENTICATED` |
| **TEST-57** | AC-36 | E2E (Playwright) | Seeded database | Log in as `borrower1`, click "Request" on available item `EQ-002`; verify pending request appears; attempt duplicate request | Button shows requested state; duplicate submission shows error message; custodian login does not display request button |

Every AC is covered by at least one test.  
Negative test cases: TEST-48, TEST-49, TEST-50, TEST-52, TEST-53, TEST-54, TEST-55, TEST-56.  
Boundary test cases: TEST-54, TEST-55.  
Concurrency and multi-user test cases: TEST-50, TEST-51.

---

## 10. Definition of Done for F-04

- [ ] All behaviors of sections 2 to 7 implemented.
- [ ] TEST-46 to TEST-57 written before implementation, observed failing (red), then passing (green). Real counts reported.
- [ ] Input validation enforced with Zod schemas returning uniform 422 error response.
- [ ] Partial unique index on `loan_requests(item_id, borrower_id) WHERE status = 'PENDING'` created in migrations and verified by test.
- [ ] Conflict responses 409 mapped with exact codes `ITEM_UNAVAILABLE` and `DUPLICATE_PENDING_REQUEST`.
- [ ] No test weakened, disabled, or skipped.
- [ ] Code reviewed by teammate (Baptiste) with specific feedback, then merged into `sprint-1-staging`.
- [ ] No secrets in Git or `.env.example`.
- [ ] Incomplete work disclosed in the PR.

---

## 11. Assumptions and open points

- In Sprint 1, submitting a request transitions it directly to `PENDING` awaiting checkout. In Sprint 2, an explicit custodian approval step (`APPROVED`) will be introduced before checkout (D-15, FR-19, BR-13).
- The partial unique index will be broadened in Sprint 2 to cover `WHERE status IN ('PENDING', 'APPROVED')` so a borrower cannot hold concurrent pending and approved requests for the same item.
- Canceling a pending request is not supported in Sprint 1 (deferred to F-09, Sprint 2).

---

## 12. Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial feature contract for F-04 before implementation | Léo (Student B) |
