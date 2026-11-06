# Requirements Traceability Matrix

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026  
**Related Issue:** #3  
**Version:** 1.6  
**Last updated:** 2026-11-06  

This matrix maps every requirement of `docs/srs.md` to a feature or system responsibility (`docs/features.md`), the sprint that establishes and verifies it, and its verification (acceptance criterion and test).

**Status values:** `Planned` (allocated, contract not yet written), `Contract pending` (Sprint 1 contract Issue not yet merged), `Specified` (AC and tests defined in a merged contract), `Verified` (tests executed and passing on a recorded commit).

Sprint 1 AC and TEST IDs are assigned in the feature contracts (Issues #6, #7, #8) and copied here when those contracts are merged. Requirements of Sprints 2 and 3 do not yet have AC or executable tests; this is intentional (see section 5).

## 1. Functional requirements

| Requirement | Summary | Feature | Sprint | AC / TEST | Status |
|---|---|---|---|---|---|
| FR-01 | Login, reject invalid credentials without revealing which part is wrong | F-01 | S1 | AC-01, AC-02, AC-03, AC-07, AC-09 / TEST-03 to TEST-08, TEST-13, TEST-14, TEST-15 | Verified (backend), TEST-15 E2E pending |
| FR-02 | Logout invalidates the session or token | F-01 | S1 | AC-05, AC-09 / TEST-10, TEST-11, TEST-15 | Verified (backend), TEST-15 E2E pending |
| FR-03 | Return identity and role of the current user | F-01 | S1 | AC-04 / TEST-09 | Verified (backend) |
| FR-04 | Display the catalog with status | F-03 | S1 | AC-20, AC-28 / TEST-31, TEST-32, TEST-45 | Verified (backend), TEST-45 E2E pending |
| FR-05 | Custodian adds an item (becomes managing custodian, starts AVAILABLE) | F-03 | S1 | AC-21, AC-23, AC-24, AC-28 / TEST-33, TEST-34, TEST-37, TEST-38, TEST-39, TEST-45 | Verified (backend), TEST-45 E2E pending |
| FR-06 | Borrower requests one AVAILABLE item, creating a PENDING request | F-04 | S1 | AC-29, AC-30, AC-31, AC-32, AC-34, AC-35, AC-36 / TEST-46, TEST-47, TEST-51, TEST-53, TEST-54, TEST-55, TEST-56, TEST-57 | Verified (backend), TEST-57 E2E pending |
| FR-07 | Borrower views own requests and loans | F-06 | S1 | AC-47, AC-48, AC-54, AC-55 / TEST-74, TEST-75, TEST-76, TEST-77, TEST-86, TEST-87 | Verified (backend), TEST-87 E2E pending |
| FR-08 | Custodian views requests of managed items | F-06 | S1 | AC-49, AC-54, AC-55 / TEST-78, TEST-88 | Verified (backend), TEST-88 E2E pending |
| FR-09 | Managing custodian checks out a PENDING request atomically | F-05 | S1 | AC-37, AC-45, AC-46 / TEST-58, TEST-66, TEST-67, TEST-70, TEST-71, TEST-72, TEST-73 | Verified (backend), TEST-73 E2E pending |
| FR-10 | Custodian records the return of an item | F-07 | S2 | Not yet elaborated | Planned |
| FR-11 | Custodian edits and retires an item | F-10 | S2 | Not yet elaborated | Planned |
| FR-12 | Borrower cancels own PENDING request | F-09 | S2 | Not yet elaborated | Planned |
| FR-13 | Due date recorded at checkout | F-08 | S2 | Not yet elaborated | Planned |
| FR-14 | Overdue flag and overdue display | F-08 | S2 | Not yet elaborated | Planned |
| FR-15 | Catalog search and filtering | F-11 | S3 | Not yet elaborated | Planned |
| FR-16 | Inventory summary and overdue report | F-12 | S3 | Not yet elaborated | Planned |
| FR-17 | Custodian views active loans of managed items | F-06 | S1 | AC-50, AC-54, AC-55 / TEST-79, TEST-80, TEST-88 | Verified (backend), TEST-88 E2E pending |
| FR-18 | Repeatable seed of demo accounts and catalog | F-03 | S1 | AC-25, AC-26 / TEST-40, TEST-41, TEST-42 | Specified |
| FR-19 | Custodian approves or rejects a PENDING request (reason on rejection) | F-14 | S2 | Not yet elaborated | Planned |
| FR-20 | Maintenance status for an item not on loan | F-10 | S2 | Not yet elaborated | Planned |
| FR-21 | Item category assigned by custodian and displayed | F-11 | S3 | Not yet elaborated | Planned |

## 2. Business rules

Rules that span several features are split by part. Each part gets its own acceptance criterion in the corresponding contract.

| Requirement | Summary | Feature (part) | Sprint | AC / TEST | Status |
|---|---|---|---|---|---|
| BR-01 | At most one ACTIVE loan per item | F-05 | S1 | AC-42, AC-43 / TEST-64, TEST-68 | Verified |
| BR-02 | Only an AVAILABLE item may be requested or checked out (409, no change) | F-04 (request side) | S1 | AC-30 / TEST-48 | Verified |
| BR-02 | (same rule) | F-05 (checkout side) | S1 | AC-41 / TEST-63 | Verified |
| BR-03 | Managing custodian scope for checkout and visibility | F-02 (access part) | S1 | AC-11, AC-12, AC-14, AC-18, AC-19 / TEST-18, TEST-19, TEST-20, TEST-23, TEST-24, TEST-29, TEST-30 | Partially verified |
| BR-03 | (same rule) | F-06 (visibility part) | S1 | AC-49, AC-50, AC-51, AC-52, AC-55 / TEST-78, TEST-79, TEST-81, TEST-82, TEST-83, TEST-84, TEST-88 | Verified (backend) |
| BR-04 | Borrower sees and acts only on own records (404 otherwise) | F-02 | S1 | AC-13, AC-17, AC-19 / TEST-21, TEST-22, TEST-28, TEST-30 | Partially verified |
| BR-05 | Concurrent checkouts never create two ACTIVE loans | F-05 | S1 | AC-42 / TEST-68, TEST-69 | Verified |
| BR-06 | No two PENDING requests of one borrower for one item (409) | F-04 | S1 | AC-31, AC-32 / TEST-49, TEST-50, TEST-51 | Verified |
| BR-07 | Only a PENDING request may be checked out, once | F-05 | S1 | AC-40, AC-44 / TEST-62, TEST-65 | Verified |
| BR-08 | Only the managing custodian changes the catalog entries of an item | F-03 (add) | S1 | AC-21, AC-22 / TEST-33, TEST-35, TEST-36 | Verified |
| BR-08 | (same rule) | F-10 (edit) | S2 | Not yet elaborated | Planned |
| BR-09 | Return closes the loan and frees the item | F-07 | S2 | Not yet elaborated | Planned |
| BR-10 | Overdue if and only if due date passed and not returned | F-08 | S2 | Not yet elaborated | Planned |
| BR-11 | Borrower cancels only own PENDING request | F-09 | S2 | Not yet elaborated | Planned |
| BR-12 | Retired item cannot be requested; item on loan cannot be retired | F-10 (retire part), F-04 (request side update) | S2 | Not yet elaborated | Planned |
| BR-13 | Approval/rejection by custodian; checkout only from APPROVED request | F-14, F-05 | S2 | Not yet elaborated | Planned |

## 3. Non-functional requirements

| Requirement | Summary | Responsibility | Established | Verified | AC / TEST | Status |
|---|---|---|---|---|---|---|
| NFR-01 | Unauthenticated request to a protected endpoint returns 401, no private data | F-02 | S1 | S1 | AC-10, AC-15, AC-07 / TEST-16, TEST-17, TEST-25, TEST-26, TEST-13, TEST-14 | Verified (backend) |
| NFR-02 | Passwords stored as salted hashes | F-01 | S1 | S1 | AC-08 / TEST-01, TEST-02, TEST-03 | Verified |
| NFR-03 | Data survives an application restart | F-03 | S1 | S1 | AC-27 / TEST-43, TEST-44 | Specified |
| NFR-04 | Configuration by environment variables, no committed secret, `.env.example` | SYS-01 | S1 | S1 | Repository inspection, README run-through (Issues #1, #15) | Planned |
| NFR-05 | Error responses expose no internal details | F-02 | S1 | S1 | AC-16 / TEST-27 | Verified |
| NFR-06 | Session or token expires (default 60 min) | F-01 | S1 | S1 | AC-06 / TEST-12 | Verified |
| NFR-07 | Loading, empty and error states on every screen | SYS-02 | S1 | S1 | Shared state components in Issue #13, E2E in Issue #14 | In progress |
| NFR-08 | Every FR and BR traceable to feature, AC and test | SYS-01 | S1 (baseline) | S1, S2, S3 (updates) | This document | In progress |
| NFR-09 | Catalog of 500 items listed in under 500 ms | F-11 | S3 | S3 | Not yet elaborated | Planned |
| NFR-10 | Builds and runs from a clean checkout, ready for Docker | SYS-01 | S1 (design) | Lab 5 (container) | README run-through (Issue #15) | Planned |
| NFR-11 | WCAG 2.1 AA contrast | F-13 | S3 | S3 | Not yet elaborated | Planned |

## 4. Coverage check

| Category | Total | Allocated to a feature or responsibility | Sprint 1 | Sprint 2 | Sprint 3 |
|---|---|---|---|---|---|
| FR | 21 | 21 | 11 (FR-01 to FR-09, FR-17, FR-18) | 7 (FR-10 to FR-14, FR-19, FR-20) | 3 (FR-15, FR-16, FR-21) |
| BR | 13 | 13 | 8 (BR-01 to BR-08, BR-08 add only) | 6 (BR-08 edit, BR-09 to BR-13) | 0 |
| NFR | 11 | 11 | 9 (NFR-01 to NFR-08, NFR-10 design) | 0 | 2 (NFR-09, NFR-11) |

Result: all 21 FRs, 13 BRs, and 11 NFRs from `docs/srs.md` are accounted for with complete feature and sprint allocation.

## 5. Coverage gaps and open points

| ID | Gap or open point | Impact | Resolution plan |
|---|---|---|---|
| G-01 | Sprint 1 AC and TEST IDs elaboration. | All Sprint 1 feature contracts are established (F-01 to F-06 in Issues #6, #7, #8). Every Sprint 1 requirement is now Specified. | Completed for Sprint 1. |
| G-02 | Sprint 2 and 3 requirements have no AC or executable tests. | Intentional (allowed by the course specification for later sprints). | Write contracts before each feature is implemented. |
| G-03 | The session mechanism (cookie or token) and expiry value are not decided (open question Q-02). | F-01 contract (NFR-06) depends on it. | Resolved by D-14 (JWT, 60 min) and D-18 (revocation); see F-01 contract. |
| G-04 | The default loan period used by FR-13 is not defined. | F-08 cannot be specified without it. | Define it in the Sprint 2 SRS update; the SRS already announces this. |
| G-05 | It is not decided whether OVERDUE is stored or derived (SRS state summary). | F-08 design. | Decide in the Sprint 2 contract of F-08. |
| G-06 | BR-12 ("a retired item cannot be requested") also affects the request flow of F-04. | F-04 must be updated in Sprint 2 when `RETIRED` exists. | Add the AC to the F-10 contract and a regression test on F-04. |
| G-07 | Assumption A-08 (a rejected checkout leaves the request PENDING) depends on open question Q-03. | F-05 AC for failed checkout. | Resolved in F-05 contract (tested in TEST-63); to be reviewed with approval in Sprint 2. |
| G-08 | F-02: TEST-19, 21 to 24 now run on real endpoints; TEST-21 is adapted (no by-id read route exists for borrowers, so AC-13 is checked through the filtered list and the 403 on checkout). TEST-25 and TEST-26 are covered by TEST-33 and TEST-47. TEST-30 (E2E) pending Issue #13. | AC-19 not yet verified. | Complete TEST-30 with the UI. |
| G-09 | TEST-15, 30, 73, 87, 88 (E2E) are pending the UI (Issues #13 and #14). | AC-09, AC-19, AC-46, AC-55 not yet verified. | Written with the UI; never skipped silently. |
| G-10 | TEST-70 to 72 and TEST-76 to 85 were written after or with the implementation of their endpoints (TEST-76 to 85 red first, TEST-70 to 72 characterization). | TDD evidence applies to TEST-58 to 63, 66 to 69, 76 to 85. | Disclosed in the PDF. |

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
| 1.2 | 2026-11-05 | AC/TEST IDs of F-03 and F-04 added (AC-20 to AC-36, TEST-31 to TEST-57); status Specified | Léo |
| 1.3 | 2026-11-05 | AC/TEST IDs of F-05 and F-06 added (AC-37 to AC-55, TEST-58 to TEST-88); all Sprint 1 requirements Specified | Léo |
| 1.4 | 2026-11-05 | Traceability aligned with SRS 1.1: FR-19 to FR-21 and BR-13 added; total coverage 21 FR / 13 BR | Léo |
| 1.5 | 2026-11-06 | Marked F-03 and F-04 backend tests as Verified (Issue #11) | Léo |
| 1.6 | 2026-11-06 | F-05 and F-06 backend tests executed (TEST-58 to TEST-63, TEST-66 to TEST-86 except E2E); F-02 tests completed on real endpoints (TEST-16, 18 to 24) | Baptiste |
| 1.7 | 2026-11-06 | Updated SYS-02 / NFR-07 status following Issue #13 (UI auth shell, role navigation and shared states) | Léo |
