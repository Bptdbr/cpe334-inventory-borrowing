# Feature Contract F-06: Consultation of Requests and Loans

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026  
**Related Issue:** #8  
**Feature:** F-06 Consultation of requests and loans  
**Requirements:** FR-07, FR-08, FR-17, BR-03 (visibility part), BR-04 (supports NFR-01, NFR-05, NFR-07, NFR-08)  
**Decisions:** D-03, D-07, D-08, D-14, D-20  
**Version:** 1.0 (written before implementation)  
**Last updated:** 2026-11-05  
**Author:** Léo (Student B, ID 69540460045)  

The detailed design is in `docs/system-sds.md` (sections 5.4, 8.2, 8.3, 10.1, 10.3 and 11). This contract defines the observable behavior, API specifications, acceptance criteria (AC-47 to AC-55), and the software test specification (TEST-74 to TEST-88) for F-06.

---

## 1. Objective and scope

Feature F-06 provides consultation endpoints and user interfaces for tracking equipment requests and active loans. It enforces strict boundary isolation: borrowers view only their own requests and loans, and custodians view only requests and active loans for equipment items they manage.

| In scope | Out of scope |
|---|---|
| Borrower views own requests (`GET /api/requests/mine`) (FR-07, BR-04) | Full department-wide loan audit logs |
| Borrower views own active loans (`GET /api/loans/mine`) (FR-07, BR-04) | Viewing past returned loan history (Sprint 2) |
| Custodian views requests for managed items (`GET /api/requests`) (FR-08, BR-03) | Viewing requests/loans of items managed by others (BR-03) |
| Custodian views active loans for managed items (`GET /api/loans`) (FR-17, BR-03) | Exporting loan reports to PDF or CSV (Sprint 3) |
| Multi-tenant isolation at database query filter level | Overdue computation and overdue lists (FR-14, Sprint 2) |
| UI pages `/my`, `/manage/requests`, and `/manage/loans` | Modifying records through consultation views |

Dependencies: F-01 (Authentication), F-02 (Authorization), F-03 (Catalog), F-04 (Requests), and F-05 (Loans).

---

## 2. Workflow

### 2.1 Borrower consultation (FR-07, BR-04)
1. An authenticated borrower navigates to `/my`.
2. The frontend calls concurrently:
   - `GET /api/requests/mine`: The request service filters `loan_requests WHERE borrower_id = :callerId`, ordered by `created_at DESC`.
   - `GET /api/loans/mine`: The loan service filters `loans WHERE borrower_id = :callerId AND status = 'ACTIVE'`, ordered by `checked_out_at DESC`.
3. The response includes nested item details (`assetTag`, `name`).
4. The borrower sees their personal requests (both `PENDING` and `FULFILLED`) and current active loans. No data of other borrowers is returned.

### 2.2 Custodian consultation (FR-08, FR-17, BR-03)
1. An authenticated custodian navigates to:
   - `/manage/requests`: The frontend calls `GET /api/requests`. The service queries `loan_requests` joined with `items WHERE items.managed_by = :callerId`. Returns requests for items managed by this custodian, including item details and borrower identity (`username`, `displayName`).
   - `/manage/loans`: The frontend calls `GET /api/loans`. The service queries `loans` joined with `items WHERE items.managed_by = :callerId AND loans.status = 'ACTIVE'`. Returns active loans on managed items.
2. Custodians never see requests or loans belonging to items managed by other custodians.

---

## 3. Business rules, validation and boundaries

| Rule | Detail |
|---|---|
| Borrower isolation (BR-04) | A borrower can access only their own requests and loans. Under no circumstances can borrower A view requests or loans belonging to borrower B. Filtered at service query level. |
| Custodian scope isolation (BR-03) | A custodian can access requests and loans only for equipment where `items.managed_by === caller.id`. Records of equipment managed by another custodian are excluded from query results. |
| Public catalog privacy (D-08) | General catalog views never expose loan holder identity; borrower details are visible only to the managing custodian via `/api/requests` and `/api/loans`. |
| Role enforcement | Borrowers calling custodian endpoints (`GET /api/requests`, `GET /api/loans`) receive 403 `FORBIDDEN_ROLE`. Custodians calling borrower endpoints (`GET /api/requests/mine`, `GET /api/loans/mine`) receive 403 `FORBIDDEN_ROLE`. |
| Empty lists | When a user has no records, endpoints return 200 OK with an empty array `[]` (not 404). |

---

## 4. Data

F-06 reads from `loan_requests`, `loans`, `items`, and `users`.

### Query joins
- `requests/mine`: `loan_requests` JOIN `items` ON `loan_requests.item_id = items.id` WHERE `loan_requests.borrower_id = :callerId`.
- `requests`: `loan_requests` JOIN `items` ON `loan_requests.item_id = items.id` JOIN `users` ON `loan_requests.borrower_id = users.id` WHERE `items.managed_by = :callerId`.
- `loans/mine`: `loans` JOIN `items` ON `loans.item_id = items.id` WHERE `loans.borrower_id = :callerId AND loans.status = 'ACTIVE'`.
- `loans`: `loans` JOIN `items` ON `loans.item_id = items.id` JOIN `users` ON `loans.borrower_id = users.id` WHERE `items.managed_by = :callerId AND loans.status = 'ACTIVE'`.

---

## 5. API

All error bodies follow: `{ "error": { "code": "...", "message": "..." } }`.

### 5.1 GET /api/requests/mine

Retrieves all borrow requests submitted by the caller.

**Headers:** `Authorization: Bearer <token>` (Borrower role only)

| Outcome | Status | Body |
|---|---|---|
| Success | 200 | Array of requests: `[ { "id": "<uuid>", "itemId": "<uuid>", "status": "PENDING", "createdAt": "<ISO-8601>", "fulfilledAt": null, "item": { "id": "<uuid>", "assetTag": "EQ-002", "name": "Multimeter" } } ]` |
| Unauthenticated | 401 | `UNAUTHENTICATED` |
| Caller is CUSTODIAN | 403 | `FORBIDDEN_ROLE` |

### 5.2 GET /api/requests

Retrieves all borrow requests on items managed by the authenticated custodian.

**Headers:** `Authorization: Bearer <token>` (Custodian role only)

| Outcome | Status | Body |
|---|---|---|
| Success | 200 | Array of requests: `[ { "id": "<uuid>", "itemId": "<uuid>", "borrowerId": "<uuid>", "status": "PENDING", "createdAt": "<ISO-8601>", "fulfilledAt": null, "borrower": { "id": "<uuid>", "username": "borrower1", "displayName": "Alice Smith" }, "item": { "id": "<uuid>", "assetTag": "EQ-002", "name": "Multimeter" } } ]` |
| Unauthenticated | 401 | `UNAUTHENTICATED` |
| Caller is BORROWER | 403 | `FORBIDDEN_ROLE` |

### 5.3 GET /api/loans/mine

Retrieves active loans belonging to the authenticated borrower.

**Headers:** `Authorization: Bearer <token>` (Borrower role only)

| Outcome | Status | Body |
|---|---|---|
| Success | 200 | Array of active loans: `[ { "id": "<uuid>", "itemId": "<uuid>", "requestId": "<uuid>", "custodianId": "<uuid>", "status": "ACTIVE", "checkedOutAt": "<ISO-8601>", "item": { "id": "<uuid>", "assetTag": "EQ-001", "name": "Oscilloscope" } } ]` |
| Unauthenticated | 401 | `UNAUTHENTICATED` |
| Caller is CUSTODIAN | 403 | `FORBIDDEN_ROLE` |

### 5.4 GET /api/loans

Retrieves all active loans on items managed by the authenticated custodian.

**Headers:** `Authorization: Bearer <token>` (Custodian role only)

| Outcome | Status | Body |
|---|---|---|
| Success | 200 | Array of active loans: `[ { "id": "<uuid>", "itemId": "<uuid>", "borrowerId": "<uuid>", "requestId": "<uuid>", "custodianId": "<uuid>", "status": "ACTIVE", "checkedOutAt": "<ISO-8601>", "borrower": { "id": "<uuid>", "username": "borrower1", "displayName": "Alice Smith" }, "item": { "id": "<uuid>", "assetTag": "EQ-001", "name": "Oscilloscope" } } ]` |
| Unauthenticated | 401 | `UNAUTHENTICATED` |
| Caller is BORROWER | 403 | `FORBIDDEN_ROLE` |

---

## 6. UI

| Screen | Behavior |
|---|---|
| My Requests and Loans (`/my`) | Visible only to logged-in borrowers. Contains two clear sections: "My Active Loans" and "My Requests". Requests display status badges (`PENDING` or `FULFILLED`). Loans display item name, asset tag, and checked-out timestamp. Empty state displays "No requests or loans yet" (NFR-07). |
| Requests to Process (`/manage/requests`) | Visible only to logged-in custodians. Displays all requests for items managed by the custodian. Includes borrower display name, item asset tag, status badge, and the "Check out" action (F-05) for pending items. Empty state: "No requests to process". |
| Active Loans (`/manage/loans`) | Visible only to logged-in custodians. Displays a table of all active loans for items managed by the custodian: Item Asset Tag, Item Name, Borrower Display Name, Checked-out Date, and Status (`ACTIVE`). Empty state: "No active loans". |
| States | Standard loading spinner during fetch, empty states when lists are empty, error banners on failed requests (SYS-02). |

---

## 7. Permissions

| Operation | Anonymous | Borrower | Custodian | Scope / Notes |
|---|---|---|---|---|
| `GET /api/requests/mine` | 401 | Allowed | 403 | Scoped strictly to caller's `borrower_id` (BR-04) |
| `GET /api/requests` | 401 | 403 | Allowed | Scoped strictly to items where `managed_by === caller.id` (BR-03) |
| `GET /api/loans/mine` | 401 | Allowed | 403 | Scoped strictly to caller's `borrower_id` (BR-04) |
| `GET /api/loans` | 401 | 403 | Allowed | Scoped strictly to items where `managed_by === caller.id` (BR-03) |

---

## 8. Acceptance criteria

| AC | Requirement | Expected observable outcome |
|---|---|---|
| **AC-47** | FR-07, BR-04 | An authenticated borrower calling `GET /api/requests/mine` receives 200 OK and an array of all requests submitted by that borrower. Requests submitted by other borrowers are never included. |
| **AC-48** | FR-07, BR-04 | An authenticated borrower calling `GET /api/loans/mine` receives 200 OK and an array of all `ACTIVE` loans where `borrower_id` matches the caller. Loans of other borrowers are never included. |
| **AC-49** | FR-08, BR-03 | An authenticated custodian calling `GET /api/requests` receives 200 OK and an array of requests for items where `managed_by` equals the custodian's ID. Requests for items managed by other custodians are never included. |
| **AC-50** | FR-17, BR-03 | An authenticated custodian calling `GET /api/loans` receives 200 OK and an array of `ACTIVE` loans for items where `managed_by` equals the custodian's ID. Active loans for items managed by other custodians are never included. |
| **AC-51** | BR-03, NFR-01 | A borrower calling `GET /api/requests` or `GET /api/loans` receives 403 `FORBIDDEN_ROLE` with no private records exposed. |
| **AC-52** | BR-03, NFR-01 | A custodian calling `GET /api/requests/mine` or `GET /api/loans/mine` receives 403 `FORBIDDEN_ROLE`. |
| **AC-53** | NFR-01 | An unauthenticated request to any of the four consultation endpoints returns 401 `UNAUTHENTICATED`. |
| **AC-54** | FR-07, FR-08, FR-17 | When a user has no matching requests or loans, the consultation endpoints return 200 OK with an empty array `[]`. |
| **AC-55** | FR-07, FR-08, FR-17, NFR-07 | In the UI, a borrower accessing `/my` sees their requests and loans with appropriate status badges; a custodian accessing `/manage/requests` and `/manage/loans` sees only equipment they manage; navigation respects roles. |

---

## 9. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-74** | AC-47 | Integration (API) | `borrower1` has request `R1`; `borrower2` has request `R2` | `borrower1` calls `GET /api/requests/mine` | 200 OK; array contains `R1`; array does NOT contain `R2` |
| **TEST-75** | AC-47 | Integration (API) | `borrower1` has requests with both `PENDING` and `FULFILLED` status | `borrower1` calls `GET /api/requests/mine` | 200 OK; all requests of `borrower1` returned with item nested objects |
| **TEST-76** | AC-48 | Integration (API) | Seeded DB: `borrower1` has active loan on `EQ-001`; `borrower2` has no loans | `borrower1` calls `GET /api/loans/mine` | 200 OK; returns active loan with `item.assetTag: "EQ-001"` |
| **TEST-77** | AC-48 | Integration (API) | `borrower2` has no loans | `borrower2` calls `GET /api/loans/mine` | 200 OK; returns empty array `[]` (TEST-54) |
| **TEST-78** | AC-49 | Integration (API) | Request `R_C1` is on item managed by `custodian1`; request `R_C2` is on item managed by `custodian2` | `custodian1` calls `GET /api/requests` | 200 OK; array contains `R_C1` with borrower details; does NOT contain `R_C2` |
| **TEST-79** | AC-50 | Integration (API) | Active loan `L_C1` on item managed by `custodian1`; active loan `L_C2` on item managed by `custodian2` | `custodian1` calls `GET /api/loans` | 200 OK; array contains `L_C1`; does NOT contain `L_C2` |
| **TEST-80** | AC-50 | Integration (API) | `custodian2` has no active loans on managed items | `custodian2` calls `GET /api/loans` | 200 OK; returns empty array `[]` |
| **TEST-81** | AC-51 | Integration (API) | Logged-in borrower | GET `/api/requests` | 403 `FORBIDDEN_ROLE`; body has no records |
| **TEST-82** | AC-51 | Integration (API) | Logged-in borrower | GET `/api/loans` | 403 `FORBIDDEN_ROLE`; body has no records |
| **TEST-83** | AC-52 | Integration (API) | Logged-in custodian | GET `/api/requests/mine` | 403 `FORBIDDEN_ROLE` |
| **TEST-84** | AC-52 | Integration (API) | Logged-in custodian | GET `/api/loans/mine` | 403 `FORBIDDEN_ROLE` |
| **TEST-85** | AC-53 | Integration (API) | No token | Call all 4 consultation endpoints | 401 `UNAUTHENTICATED` for all four endpoints |
| **TEST-86** | AC-54 | Integration (API) | Fresh borrower with no requests | GET `/api/requests/mine` | 200 OK; returns `[]` |
| **TEST-87** | AC-55 | E2E (Playwright) | Seeded database | Log in as `borrower1`, open `/my`, verify active loan and request displayed; verify `/manage/requests` cannot be accessed | Loan and request visible on `/my`; navigating to `/manage/requests` shows 403 error state |
| **TEST-88** | AC-55 | E2E (Playwright) | Seeded database | Log in as `custodian1`, open `/manage/requests` and `/manage/loans`, verify only `custodian1` items appear; verify `/my` is not accessible | Managed requests and active loans visible; borrower screen `/my` returns 403 or is redirected |

Every AC is covered by at least one test.  
Negative and permission test cases: TEST-81, TEST-82, TEST-83, TEST-84, TEST-85.  
Data isolation test cases: TEST-74, TEST-76, TEST-78, TEST-79.  
Empty state test cases: TEST-77, TEST-80, TEST-86.  
E2E role test cases: TEST-87, TEST-88.

---

## 10. Definition of Done for F-06

- [ ] All behaviors of sections 2 to 7 implemented.
- [ ] TEST-74 to TEST-88 written before implementation, observed failing (red), then passing (green). Real counts reported.
- [ ] Query filters strictly enforce `borrower_id` and `items.managed_by` on all endpoints.
- [ ] Role middleware protects all 4 routes (403 for unauthorized roles).
- [ ] Responses format timestamps in ISO-8601 UTC and nest related entities cleanly.
- [ ] PR reviewed by teammate (Baptiste) with specific feedback, then merged into `sprint-1-staging`.
- [ ] No secrets in Git or `.env.example`.
- [ ] Incomplete work disclosed in the PR.

---

## 11. Assumptions and open points

- In Sprint 1, loans list returns only `ACTIVE` loans. In Sprint 2, returned loans (`RETURNED`) and overdue flags (`OVERDUE`) will be introduced (FR-10, FR-14).
- Pagination is not implemented in Sprint 1; full lists are returned.

---

## 12. Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial feature contract for F-06 before implementation | Léo (Student B) |
