# Feature Contract F-01: Authentication

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026
**Related Issue:** #6
**Feature:** F-01 Authentication
**Requirements:** FR-01, FR-02, FR-03, NFR-02, NFR-06 (supports NFR-04, NFR-05)
**Decisions:** D-07, D-12, D-14, D-18, D-19, D-20, D-21
**Version:** 1.1 (written before implementation)
**Last updated:** 2026-11-05

The detailed design is in `docs/system-sds.md` (sections 8 to 10). This contract fixes the observable behavior, the acceptance criteria (AC-01 to AC-09) and the tests (TEST-01 to TEST-15) of F-01.

## 1. Objective and scope

A seeded user logs in with a username and password, uses the returned token, can retrieve their identity, and logs out so that the token is no longer usable.

| In scope | Out of scope |
|---|---|
| Login, logout, current user | Self-registration, password recovery, email verification (D-12) |
| Password hashing with argon2id (D-19) | Refresh tokens, "remember me" |
| Signed JWT with 60-minute expiry (D-14, NFR-06) | Role and ownership checks on domain endpoints (F-02) |
| Logout by revocation of the token `jti` (D-18) | Account lockout, rate limiting |
| Login and logout screens | Periodic cleanup of `revoked_tokens` |

Dependencies: none (F-01 is the foundation). F-02, F-03, F-04, F-05 and F-06 depend on it.

## 2. Workflow

1. The user submits `username` and `password` on the login screen.
2. The API validates the body (422 if invalid), loads the user, and verifies the password with argon2id.
3. On success the API returns a signed token (`sub`, `jti`, `iat`, `exp`) and the user identity. The SPA keeps the token in `sessionStorage` (D-21).
4. Each later request carries `Authorization: Bearer <token>`. The auth middleware checks, in order: header present, signature valid, not expired, `jti` not revoked, user still exists. Any failure returns 401.
5. `GET /api/auth/me` returns the identity and role of the caller, read from the database (D-20).
6. Logout stores the `jti` in `revoked_tokens` and returns 204. The same token is rejected afterwards.

## 3. Business rules, validation and boundaries

| Rule | Detail |
|---|---|
| Generic failure | An unknown username and a wrong password return the same status, code and message (FR-01). |
| Timing | For an unknown username the service still verifies against a fixed dummy hash. |
| Token content | `sub`, `jti`, `iat`, `exp` only. No role, no password data (D-20). |
| Lifetime | `exp = iat + JWT_EXPIRES_IN_MINUTES` (default 60). A token whose `exp` has passed is rejected. |
| Revocation | A revoked `jti` is rejected until its natural expiry. |
| Deleted user | A valid token whose user no longer exists is rejected with 401. |
| Login body | `username`: string, 1 to 50 characters. `password`: string, 1 to 128 characters. Both required. Other fields are ignored. |
| No leakage | No response contains `password_hash`, the secret, or a stack trace (NFR-05). |

## 4. Data

No new table. F-01 uses `users` (`username`, `password_hash`, `role`, `display_name`) and `revoked_tokens` (`jti`, `expires_at`, `revoked_at`) as defined in SDS section 5.2. The seed (F-03) creates the demo users with argon2id hashes of `SEED_DEMO_PASSWORD`.

## 5. API

Error body for all failures: `{ "error": { "code": "...", "message": "..." } }` (SDS 10.3).

### 5.1 POST /api/auth/login

Request body:

    { "username": "borrower1", "password": "<demo password>" }

| Outcome | Status | Body |
|---|---|---|
| Success | 200 | `{ "token": "<jwt>", "expiresAt": "<ISO 8601 UTC>", "user": { "id", "username", "displayName", "role" } }` |
| Unknown user or wrong password | 401 | `INVALID_CREDENTIALS`, message "Invalid username or password" |
| Missing, empty or too long field, wrong type | 422 | `VALIDATION_ERROR` with `details` |

### 5.2 GET /api/auth/me

| Outcome | Status | Body |
|---|---|---|
| Valid token | 200 | `{ "id", "username", "displayName", "role" }` |
| Missing, malformed, badly signed, expired or revoked token, or deleted user | 401 | `UNAUTHENTICATED` |

### 5.3 POST /api/auth/logout

| Outcome | Status | Body |
|---|---|---|
| Valid token | 204 | Empty. The `jti` is stored in `revoked_tokens`. |
| No valid token | 401 | `UNAUTHENTICATED` |

## 6. UI

| Screen | Behavior |
|---|---|
| Login (`/login`) | Username and password fields with visible labels, submit button disabled while the request is pending. On success: token saved in `sessionStorage`, redirect to `/items`. On 401: the generic message from the server is shown. On 422: field messages. The password is never prefilled or logged. |
| Navigation bar | Shows the display name, read from `/api/auth/me`, and a **Log out** button. |
| Logout | Calls the logout endpoint, deletes the token, redirects to `/login`. |
| Any 401 on a later call | The token is deleted and the user is sent to `/login` with "Your session has expired, please log in again." |
| Loading, empty, error states | As defined in SDS section 11. |

The UI does not decide access. It only reflects what the API returns.

## 7. Permissions

| Operation | Anonymous | Borrower | Custodian |
|---|---|---|---|
| `POST /api/auth/login` | Allowed | n/a | n/a |
| `POST /api/auth/logout` | 401 | Allowed | Allowed |
| `GET /api/auth/me` | 401 | Allowed | Allowed |

## 8. Acceptance criteria

| AC | Requirement | Expected observable outcome |
|---|---|---|
| AC-01 | FR-01 | Login with valid credentials returns 200 with a token, an `expiresAt` 60 minutes after issue, and the user's id, username, display name and role. The response contains no password data. The token contains `sub`, `jti`, `iat`, `exp` and no role. |
| AC-02 | FR-01 | Login with a wrong password and login with an unknown username both return 401 with an identical body (`INVALID_CREDENTIALS`). |
| AC-03 | FR-01 | Login with a missing, empty or too long field returns 422 `VALIDATION_ERROR` and no token. |
| AC-04 | FR-03 | `GET /api/auth/me` with a valid token returns the caller's id, username, display name and role. |
| AC-05 | FR-02 | After logout (204), the same token is rejected with 401 on `/api/auth/me`, and its `jti` is stored in `revoked_tokens`. |
| AC-06 | NFR-06 | A token past its expiry is rejected with 401. |
| AC-07 | FR-01, NFR-01 | A request with no token, a malformed token, a badly signed token, or a token of a deleted user is rejected with 401 and no private data. |
| AC-08 | NFR-02 | The stored password value differs from the password and has the argon2id format. No API response ever contains it. |
| AC-09 | FR-01, FR-02 | In the UI, a user logs in, reaches the catalog, logs out, returns to `/login`, and cannot reach a protected screen afterwards. |

## 9. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-08 | Unit | A plain password | Hash it, then verify it with the right and a wrong password | Hash differs from the password and starts with `$argon2id$`; right password verifies, wrong does not |
| TEST-02 | AC-08 | Integration (DB) | Seeded database | Read `password_hash` of a seeded user | Value differs from `SEED_DEMO_PASSWORD` and starts with `$argon2id$` |
| TEST-03 | AC-01, AC-08 | Integration (API) | Seeded borrower | POST login with valid credentials | 200; token, `expiresAt`, user with role `BORROWER`; body has no `password` or `password_hash` |
| TEST-04 | AC-01 | Integration (API) | Valid login, test clock | Decode the token | Claims `sub`, `jti`, `iat`, `exp` present; `exp - iat` = 60 minutes; no role claim |
| TEST-05 | AC-02 | Integration (API) | Seeded borrower | POST login with a wrong password | 401 `INVALID_CREDENTIALS`, no token |
| TEST-06 | AC-02 | Integration (API) | No such user | POST login with an unknown username | 401; status, code and message identical to TEST-05 |
| TEST-07 | AC-03 | Integration (API) | None | POST login without `password` | 422 `VALIDATION_ERROR`, no token |
| TEST-08 | AC-03 | Integration (API), boundary | None | POST login with an empty username, then with a 51-character username | 422 in both cases |
| TEST-09 | AC-04 | Integration (API) | Logged-in custodian | GET `/api/auth/me` | 200 with the custodian's id, username, display name and role `CUSTODIAN` |
| TEST-10 | AC-05 | Integration (API + DB) | Logged-in user | POST logout | 204; the token's `jti` exists in `revoked_tokens` |
| TEST-11 | AC-05 | Integration (API) | Token already logged out | GET `/api/auth/me` with the same token | 401 `UNAUTHENTICATED` |
| TEST-12 | AC-06 | Integration (API) | Valid token and a system clock advanced by 61 minutes (fake timers on Date) | Wait past expiry, then GET /api/auth/me | 401 |
| TEST-13 | AC-07 | Integration (API) | None | GET `/api/auth/me` with no header, with `Bearer garbage`, and with a token signed by another secret | 401 in all three cases; body has no private data |
| TEST-14 | AC-07 | Integration (API + DB) | Valid token, then user deleted from the test database | GET `/api/auth/me` | 401 |
| TEST-15 | AC-09 | E2E (Playwright) | Seeded borrower | Log in through the UI, open the catalog, log out, then open `/items` | Catalog shown after login; after logout the browser is on `/login` and `/items` redirects to `/login` |

Every AC is covered by at least one test. Negative cases: TEST-05, 06, 07, 08, 11, 12, 13, 14. Boundary cases: TEST-08, TEST-12.

## 10. Definition of Done for F-01

- [ ] Behavior of sections 2 to 7 implemented.
- [ ] TEST-01 to TEST-15 written before the implementation, failing, then passing (red and green output kept).
- [ ] Full test suite run on the PR branch, with the real counts of passed, failed and skipped tests.
- [ ] No test weakened, disabled or skipped to obtain a pass.
- [ ] PR reviewed by the teammate with a specific check, then merged into `sprint-1-staging`.
- [ ] `.env.example` and README list `JWT_SECRET`, `JWT_EXPIRES_IN_MINUTES` and `SEED_DEMO_PASSWORD`.
- [ ] No secret in Git.
- [ ] Incomplete work disclosed in the PR.

Evidence kept for the PDF: test file and test names, command and output (red then green), tested commit, a login/logout screenshot, and the PR with its review.

## 11. Assumptions and open points

- No rate limiting or lockout in Sprint 1 (listed as a limitation).
- The token in `sessionStorage` is readable by scripts (D-21, accepted limitation).
- If `argon2` cannot be installed on a team machine, a fallback to bcryptjs is recorded as a new decision and TEST-01 and TEST-02 are updated visibly.

## 12. Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial contract, before implementation | Baptiste |
| 1.1 | 2026-11-05 | TEST-12 uses an advanced clock instead of a short expiry (faster, same behavior verified) | Baptiste |