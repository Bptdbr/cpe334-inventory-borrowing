# Feature Contract F-02: Authorization and Ownership

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026
**Related Issue:** #6
**Feature:** F-02 Authorization and ownership
**Requirements:** BR-03 (access part), BR-04, NFR-01, NFR-05
**Decisions:** D-07, D-14, D-20
**Version:** 1.0 (written before implementation)
**Last updated:** 2026-11-05

The detailed design is in `docs/system-sds.md` (sections 2.5, 5.4, 8 and 10). This contract fixes the observable behavior, the acceptance criteria (AC-10 to AC-19) and the tests (TEST-16 to TEST-30) of F-02. Domain-specific ownership cases on requests and loans are completed in the contracts of F-04, F-05 and F-06; F-02 provides the mechanism and verifies it on shared endpoints.

## 1. Objective and scope

The backend rejects every unauthenticated call, every call whose role is not allowed, and every access to a record outside the caller's scope, with consistent status codes and no private data.

| In scope | Out of scope |
|---|---|
| Auth middleware applied to all protected routes | Login, logout, token lifecycle (F-01) |
| Role middleware declared per route (403) | Domain rules of requests and checkout (F-04, F-05) |
| Scope filter helper for ownership (404) | Role administration, multiple roles per account |
| Uniform error format, no internal details (NFR-05) | Rate limiting |
| Test over every protected Sprint 1 endpoint (NFR-01) | |

Dependencies: F-01.

## 2. Workflow

Order of checks on every request (SDS 10.4): authentication (401), role (403), input validation (422), scope (404), state (409).

1. Auth middleware validates the token and attaches the current user (loaded from the database, D-20).
2. Role middleware compares the user's role with the roles declared for the route.
3. The service applies the scope filter: borrower `borrower_id = currentUser.id`; custodian `item.managed_by = currentUser.id`.
4. A record outside the scope is reported as 404, identical to a non-existent record.

## 3. Business rules, validation and boundaries

| Rule | Detail |
|---|---|
| Identity from the server | No endpoint reads a user id, role or `managed_by` from the client. Such fields in a body are ignored. |
| 401 vs 403 | No or invalid token is 401. A valid token with a disallowed role is 403. |
| 403 vs 404 | A role allowed for the operation but a record outside the scope is 404 (D-07). |
| Same 404 | A record that does not exist and a record outside the scope return the same status, code and message. |
| Malformed id | An identifier that is not a UUID returns 422. |
| Unknown route | 404 with the standard error format. |
| Internal errors | An unexpected failure returns 500 `INTERNAL_ERROR` with a generic message and no stack trace, SQL or path (NFR-05). |

## 4. Data

No new table. Ownership uses `items.managed_by`, `loan_requests.borrower_id` and `loans.borrower_id` (SDS 5.4).

## 5. API

No new endpoint. F-02 applies to the protected endpoints below. Paths come from the SDS matrix (8.2) and are confirmed in the contracts of Issues #7 and #8.

| # | Endpoint | Allowed roles |
|---|---|---|
| 1 | `POST /api/auth/logout` | BORROWER, CUSTODIAN |
| 2 | `GET /api/auth/me` | BORROWER, CUSTODIAN |
| 3 | `GET /api/items` | BORROWER, CUSTODIAN |
| 4 | `POST /api/items` | CUSTODIAN |
| 5 | `POST /api/requests` | BORROWER |
| 6 | `GET /api/requests/mine` | BORROWER |
| 7 | `GET /api/requests` | CUSTODIAN |
| 8 | `POST /api/requests/{id}/checkout` | CUSTODIAN |
| 9 | `GET /api/loans/mine` | BORROWER |
| 10 | `GET /api/loans` | CUSTODIAN |

`POST /api/auth/login` and `GET /health` are public.

Error codes used: `UNAUTHENTICATED` (401), `FORBIDDEN_ROLE` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `INTERNAL_ERROR` (500).

## 6. UI

No new screen. The navigation shows only the entries of the current role (SDS 11.1). This is a convenience only: typing a hidden URL leads to the API answer (403) displayed in the error state.

## 7. Permissions

The full matrix is SDS 8.2. The table in section 5 lists the allowed roles per endpoint. Every other role gets 403, and anonymous callers get 401.

## 8. Acceptance criteria

| AC | Requirement | Expected observable outcome |
|---|---|---|
| AC-10 | NFR-01 | Each of the 10 protected endpoints returns 401 without a token, with the standard error body and no private data. |
| AC-11 | BR-03 | A borrower calling a custodian-only endpoint (4, 7, 8, 10) gets 403 `FORBIDDEN_ROLE` and nothing is changed. |
| AC-12 | BR-03 | A custodian calling a borrower-only endpoint (5, 6, 9) gets 403 `FORBIDDEN_ROLE` and nothing is changed. |
| AC-13 | BR-04 | A borrower reading another borrower's record gets 404 `NOT_FOUND`, with no private data, and the response is identical to that of a non-existent id. |
| AC-14 | BR-03 | A custodian reading or acting on a record of an item managed by another custodian gets 404 `NOT_FOUND`. |
| AC-15 | NFR-01 | A user id, role or `managed_by` value sent in a request body is ignored: the identity and ownership used are those of the token. |
| AC-16 | NFR-05 | A forced server error returns 500 `INTERNAL_ERROR` with a generic message and no stack trace, SQL error or file path. |
| AC-17 | BR-04 | A malformed identifier returns 422 `VALIDATION_ERROR`; an unknown route returns 404 in the standard format. |
| AC-18 | BR-03 | A role change in the database takes effect on the next request with the same token (role is not read from the token). |
| AC-19 | BR-03, BR-04 | In the UI, the navigation of a borrower does not show custodian screens, and opening a custodian URL shows the 403 error state. |

## 9. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-16 | AC-10 | Integration (API) | None | Call each of the 10 endpoints with no token (table-driven) | 401 `UNAUTHENTICATED` for all; no private data in any body |
| TEST-17 | AC-10 | Integration (API) | Valid token, then expired or revoked | Call a protected endpoint | 401 in both cases |
| TEST-18 | AC-11 | Integration (API) | Logged-in borrower | Call endpoints 4, 7, 8 and 10 | 403 `FORBIDDEN_ROLE` for each |
| TEST-19 | AC-11 | Integration (API + DB) | Logged-in borrower, item count known | POST `/api/items` as borrower | 403; item count unchanged |
| TEST-20 | AC-12 | Integration (API) | Logged-in custodian | Call endpoints 5, 6 and 9 | 403 `FORBIDDEN_ROLE` for each |
| TEST-21 | AC-13 | Integration (API) | Request owned by borrower B, logged in as borrower A | A requests B's record by id | 404 `NOT_FOUND`, no private data |
| TEST-22 | AC-13 | Integration (API) | Logged-in borrower | Request a random valid UUID | 404 with status, code and message identical to TEST-21 |
| TEST-23 | AC-14 | Integration (API) | Request on an item managed by custodian 2, logged in as custodian 1 | Custodian 1 acts on that request | 404 `NOT_FOUND`; nothing changed |
| TEST-24 | AC-14 | Integration (API) | Custodian 1 logged in | List managed requests and loans | Only records of items managed by custodian 1 |
| TEST-25 | AC-15 | Integration (API + DB) | Logged-in custodian 1 | POST `/api/items` with `managedBy` set to custodian 2 | Item created with `managed_by` = custodian 1 |
| TEST-26 | AC-15 | Integration (API + DB) | Logged-in borrower A | POST `/api/requests` with `borrowerId` of borrower B | Request created for borrower A |
| TEST-27 | AC-16 | Integration (API) | Test hook that forces a service failure | Call the endpoint | 500 `INTERNAL_ERROR`; body has no stack trace, SQL or path |
| TEST-28 | AC-17 | Integration (API), boundary | Logged-in user | Request `/api/requests/not-a-uuid`, then an unknown route | 422 `VALIDATION_ERROR`, then 404 standard format |
| TEST-29 | AC-18 | Integration (API + DB) | Token of a user, role changed in the database | Call a custodian-only endpoint before and after the change | 403 before, success after, same token |
| TEST-30 | AC-19 | E2E (Playwright) | Seeded borrower | Log in, inspect navigation, open `/manage/requests` | No custodian entry in the navigation; 403 error state displayed |

Every AC is covered by at least one test. Negative cases: TEST-16 to TEST-23, TEST-27, TEST-28. Boundary cases: TEST-22, TEST-28.

Note: TEST-21, 23 and 24 need request and loan records. They use records created by the test setup or the seed; their domain rules are specified in the F-04, F-05 and F-06 contracts.

## 10. Definition of Done for F-02

- [ ] Behavior of sections 2 to 7 implemented.
- [ ] TEST-16 to TEST-30 written before the implementation, failing, then passing (red and green output kept).
- [ ] Tests on endpoints 5 to 10 are completed when those endpoints exist (Issues #11 and #12); until then they are listed as pending, never skipped silently.
- [ ] Full test suite run with the real counts of passed, failed and skipped tests.
- [ ] No test weakened, disabled or skipped to obtain a pass.
- [ ] PR reviewed by the teammate with a specific check, then merged into `sprint-1-staging`.
- [ ] No secret in Git.
- [ ] Incomplete work disclosed in the PR.

Evidence kept for the PDF: test file and names, command and output (red then green), tested commit, a screenshot of a 403 and of a 404 case, and the PR with its review.

## 11. Assumptions and open points

- The endpoint list in section 5 is updated if the contracts of Issues #7 and #8 change a path (visible revision).
- Custodian-side visibility of a borrower's private detail is limited to managed items (BR-03).

## 12. Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial contract, before implementation | Baptiste |