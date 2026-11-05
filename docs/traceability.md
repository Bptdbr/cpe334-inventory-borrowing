# Requirements Traceability Matrix

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026
**Related Issue:** #3
**Version:** 1.1 (draft for PR review)
**Last updated:** 2026-11-03

This matrix maps every requirement of `docs/srs.md` to a feature or system responsibility (`docs/features.md`), the sprint that establishes and verifies it, and its verification (acceptance criterion and test).

**Status values:** `Planned` (allocated, contract not yet written), `Contract pending` (Sprint 1 contract Issue not yet merged), `Specified` (AC and tests defined in a merged contract), `Verified` (tests executed and passing on a recorded commit).

Sprint 1 AC and TEST IDs are assigned in the feature contracts (Issues #6, #7, #8) and copied here when those contracts are merged. Requirements of Sprints 2 and 3 do not yet have AC or executable tests; this is intentional (see section 5).

## 1. Functional requirements

| Requirement | Summary | Feature | Sprint | AC / TEST | Status |
|---|---|---|---|---|---|
| FR-01 | Login, reject invalid credentials without revealing which part is wrong | F-01 | S1 | AC-01, AC-02, AC-03, AC-07, AC-09 / TEST-03 to TEST-08, TEST-13, TEST-14, TEST-15 | Specified |
| FR-02 | Logout invalidates the session or token | F-01 | S1 | AC-05, AC-09 / TEST-10, TEST-11, TEST-15 | Specified |
| FR-03 | Return identity and role of the current user | F-01 | S1 | AC-04 / TEST-09 | Specified |
| FR-04 | Display the catalog with status | F-03 | S1 | Contract Issue #7 | Contract pending |
| FR-05 | Custodian adds an item (becomes managing custodian, starts AVAILABLE) | F-03 | S1 | Contract Issue #7 | Contract pending |
| FR-06 | Borrower requests one AVAILABLE item, creating a PENDING request | F-04 | S1 | Contract Issue #7 | Contract pending |
| FR-07 | Borrower views own requests and loans | F-06 | S1 | Contract Issue #8 | Contract pending |
| FR-08 | Custodian views requests of managed items | F-06 | S1 | Contract Issue #8 | Contract pending |
| FR-09 | Managing custodian checks out a PENDING request atomically | F-05 | S1 | Contract Issue #8 | Contract pending |
| FR-10 | Custodian records the return of an item | F-07 | S2 | Not yet elaborated | Planned |
| FR-11 | Custodian edits and retires an item | F-10 | S2 | Not yet elaborated | Planned |
| FR-12 | Borrower cancels own PENDING request | F-09 | S2 | Not yet elaborated | Planned |
| FR-13 | Due date recorded at checkout | F-08 | S2 | Not yet elaborated | Planned |
| FR-14 | Overdue flag and overdue display | F-08 | S2 | Not yet elaborated | Planned |
| FR-15 | Catalog search and filtering | F-11 | S3 | Not yet elaborated | Planned |
| FR-16 | Inventory summary and overdue report | F-12 | S3 | Not yet elaborated | Planned |
| FR-17 | Custodian views active loans of managed items | F-06 | S1 | Contract Issue #8 | Contract pending |
| FR-18 | Repeatable seed of demo accounts and catalog | F-03 | S1 | Contract Issue #7 | Contract pending |

## 2. Business rules

Rules that span several features are split by part. Each part gets its own acceptance criterion in the corresponding contract.

| Requirement | Summary | Feature (part) | Sprint | AC / TEST | Status |
|---|---|---|---|---|---|
| BR-01 | At most one ACTIVE loan per item | F-05 | S1 | Contract Issue #8 (integration test and database constraint) | Contract pending |
| BR-02 | Only an AVAILABLE item may be requested or checked out (409, no change) | F-04 (request side) | S1 | Contract Issue #7 | Contract pending |
| BR-02 | (same rule) | F-05 (checkout side) | S1 | Contract Issue #8 | Contract pending |
| BR-03 | Managing custodian scope for checkout and visibility | F-02 (access part) | S1 | AC-11, AC-12, AC-14, AC-18, AC-19 / TEST-18, TEST-19, TEST-20, TEST-23, TEST-24, TEST-29, TEST-30 | Specified |
| BR-03 | (same rule) | F-06 (visibility part) | S1 | Contract Issue #8 | Contract pending |
| BR-04 | Borrower sees and acts only on own records (404 otherwise) | F-02 | S1 | AC-13, AC-17, AC-19 / TEST-21, TEST-22, TEST-28, TEST-30 | Specified |
| BR-05 | Concurrent checkouts never create two ACTIVE loans | F-05 | S1 | Contract Issue #8 (concurrency integration test) | Contract pending |
| BR-06 | No two PENDING requests of one borrower for one item (409) | F-04 | S1 | Contract Issue #7 | Contract pending |
| BR-07 | Only a PENDING request may be checked out, once | F-05 | S1 | Contract Issue #8 | Contract pending |
| BR-08 | Only the managing custodian changes the catalog entries of an item | F-03 (add) | S1 | Contract Issue #7 | Contract pending |
| BR-08 | (same rule) | F-10 (edit) | S2 | Not yet elaborated | Planned |
| BR-09 | Return closes the loan and frees the item | F-07 | S2 | Not yet elaborated | Planned |
| BR-10 | Overdue if and only if due date passed and not returned | F-08 | S2 | Not yet elaborated | Planned |
| BR-11 | Borrower cancels only own PENDING request | F-09 | S2 | Not yet elaborated | Planned |
| BR-12 | Retired item cannot be requested; item on loan cannot be retired | F-10 (retire part), F-04 (request side update) | S2 | Not yet elaborated | Planned |

## 3. Non-functional requirements

| Requirement | Summary | Responsibility | Established | Verified | AC / TEST | Status |
|---|---|---|---|---|---|---|
| NFR-01 | Unauthenticated request to a protected endpoint returns 401, no private data | F-02 | S1 | S1 | AC-10, AC-15, AC-07 / TEST-16, TEST-17, TEST-25, TEST-26, TEST-13, TEST-14 | Specified |
| NFR-02 | Passwords stored as salted hashes | F-01 | S1 | S1 | AC-08 / TEST-01, TEST-02, TEST-03 | Specified |
| NFR-03 | Data survives an application restart | F-03 | S1 | S1 | Contract Issue #7 | Contract pending |
| NFR-04 | Configuration by environment variables, no committed secret, `.env.example` | SYS-01 | S1 | S1 | Repository inspection, README run-through (Issues #1, #15) | Planned |
| NFR-05 | Error responses expose no internal details | F-02 | S1 | S1 | AC-16 / TEST-27 | Specified |
| NFR-06 | Session or token expires (default 60 min) | F-01 | S1 | S1 | AC-06 / TEST-12 | Specified |
| NFR-07 | Loading, empty and error states on every screen | SYS-02 | S1 | S1 | Conventions in Issue #5, E2E in Issue #14 | Planned |
| NFR-08 | Every FR and BR traceable to feature, AC and test | SYS-01 | S1 (baseline) | S1, S2, S3 (updates) | This document | In progress |
| NFR-09 | Catalog of 500 items listed in under 500 ms | F-11 | S3 | S3 | Not yet elaborated | Planned |
| NFR-10 | Builds and runs from a clean checkout, ready for Docker | SYS-01 | S1 (design) | Lab 5 (container) | README run-through (Issue #15) | Planned |
| NFR-11 | WCAG 2.1 AA contrast | F-13 | S3 | S3 | Not yet elaborated | Planned |

## 4. Coverage check

| Category | Total | Allocated to a feature or responsibility | Sprint 1 | Sprint 2 | Sprint 3 |
|---|---|---|---|---|---|
| FR | 18 | 18 | 11 (FR-01 to FR-09, FR-17, FR-18) | 5 (FR-10 to FR-14) | 2 (FR-15, FR-16) |
| BR | 12 | 12 | 8 (BR-01 to BR-08, BR-08 add only) | 5 (BR-08 edit, BR-09 to BR-12) | 0 |
| NFR | 11 | 11 | 9 (NFR-01 to NFR-08, NFR-10 design) | 0 | 2 (NFR-09, NFR-11) |

Result: no requirement of the SRS baseline is without a feature or responsibility, and every requirement has a sprint.

## 5. Coverage gaps and open points

| ID | Gap or open point | Impact | Resolution plan |
|---|---|---|---|
| G-01 | Sprint 1 AC and TEST IDs do not exist yet. | The AC / TEST columns of Sprint 1 rows point to the contract Issues. | F-01 and F-02 filled (Issue #6). F-03 to F-06 pending (Issues #7, #8).|
| G-02 | Sprint 2 and 3 requirements have no AC or executable tests. | Intentional (allowed by the course specification for later sprints). | Write contracts before each feature is implemented. |
| G-03 | The session mechanism (cookie or token) and expiry value are not decided (open question Q-02). | F-01 contract (NFR-06) depends on it. | Resolved by D-14 (JWT, 60 min) and D-18 (revocation); see F-01 contract.|
| G-04 | The default loan period used by FR-13 is not defined. | F-08 cannot be specified without it. | Define it in the Sprint 2 SRS update; the SRS already announces this. |
| G-05 | It is not decided whether OVERDUE is stored or derived (SRS state summary). | F-08 design. | Decide in the Sprint 2 contract of F-08. |
| G-06 | BR-12 ("a retired item cannot be requested") also affects the request flow of F-04. | F-04 must be updated in Sprint 2 when `RETIRED` exists. | Add the AC to the F-10 contract and a regression test on F-04. |
| G-07 | Assumption A-08 (a rejected checkout leaves the request PENDING) depends on open question Q-03. | F-05 AC for failed checkout. | Use the assumption in the Sprint 1 contract; revisit in Sprint 2. |

## 6. Approved changes

| Change | Requirement | Date | Justification | Approved by |
|---|---|---|---|---|
| None since baseline 1.0 | n/a | n/a | n/a | n/a |

Any later change to scope, allocation or requirements is added here with its justification. Requirements are never silently removed or renumbered.

## 7. Maintenance

- This matrix is updated when a contract is merged (AC and TEST IDs), and when a test is executed (actual test name and result, status `Verified`).
- The actual test file, test name and result of each Sprint 1 AC appear in Part F of the Deliverable 1 PDF.

## 8. Change history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial matrix for FR-01 to FR-18, BR-01 to BR-12, NFR-01 to NFR-11 | Baptiste |
| 1.1 | 2026-11-05 | AC/TEST IDs of F-01 and F-02 added (AC-01 to AC-19, TEST-01 to TEST-30); status Specified | Baptiste |