# Feature Inventory

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026
**Related Issue:** #3
**Version:** 1.0 (draft for PR review)
**Last updated:** 2026-11-03

Each feature has a stable ID. Cross-cutting requirements that do not belong to one domain feature are assigned to a named system responsibility (SYS-xx). Requirement IDs come from `docs/srs.md`. Sprint columns follow the allocation in the SRS (section 10).

## 1. Domain features

| ID | Feature | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication | Login with username and password, logout, current user identity, session/token with expiry. | FR-01, FR-02, FR-03, NFR-02, NFR-06 | None | S1 |
| F-02 | Authorization and ownership | Backend enforcement of roles and of record ownership (borrower scope, managing custodian scope); uniform 401/403/404 behavior. | BR-03 (access part), BR-04, NFR-01, NFR-05 | F-01 | S1 |
| F-03 | Catalog and seed data | Catalog of individually tracked items with status and managing custodian; custodian adds an item; repeatable seed of demo accounts and catalog; data persistence. | FR-04, FR-05, FR-18, BR-08 (add), NFR-03 | F-01, F-02 | S1 |
| F-04 | Borrow request | A borrower requests one available item, creating a PENDING request; rejects unavailable items and duplicate PENDING requests. | FR-06, BR-02 (request side), BR-06 | F-01, F-02, F-03 | S1 |
| F-05 | Checkout | The managing custodian checks out a PENDING request: creates an ACTIVE loan, fulfills the request, sets the item ON_LOAN, atomically; rejects unavailable items, duplicate active loans, repeated checkout and concurrent checkouts. | FR-09, BR-01, BR-02 (checkout side), BR-03 (checkout part), BR-05, BR-07 | F-03, F-04 | S1 |
| F-06 | Consultation of requests and loans | Borrower sees own requests and loans; custodian sees requests and active loans of managed items; private data of others is never returned. | FR-07, FR-08, FR-17, BR-03 (visibility part), BR-04 | F-04, F-05 | S1 |
| F-07 | Item return | The managing custodian records a return: closes the loan and sets the item AVAILABLE. | FR-10, BR-09 | F-05 | S2 |
| F-08 | Due date and overdue status | Due date recorded at checkout; overdue computed from the due date; overdue loans shown to custodian and borrower. | FR-13, FR-14, BR-10 | F-05, F-07 | S2 |
| F-09 | Request cancellation | A borrower cancels their own PENDING request. | FR-12, BR-11 | F-04 | S2 |
| F-10 | Item maintenance | The managing custodian edits an item and retires an item that is not on loan; retired items cannot be requested. | FR-11, BR-08 (edit), BR-12 | F-03 | S2 |
| F-11 | Catalog search and filtering | Search by name or asset tag, filter by availability status, with a response-time target. | FR-15, NFR-09 | F-03 | S3 |
| F-12 | Inventory summary and overdue report | Counts of available, on-loan and overdue items and list of overdue loans for managed items. | FR-16 | F-08 | S3 |
| F-13 | Hardening and accessibility | Failure handling, usability review, regression pass, contrast compliance. | NFR-11 | All | S3 |

## 2. System responsibilities (cross-cutting)

| ID | Responsibility | Description | Requirements | Established in | Verified in |
|---|---|---|---|---|---|
| SYS-01 | Engineering baseline and delivery readiness | Repository workflow, externalized configuration, `.env.example`, documented setup, container-ready design, traceability maintenance. | NFR-04, NFR-08, NFR-10 | S1 (Issues #1, #3, #5) | S1 (design), Lab 5 (container), S2 and S3 (traceability updates) |
| SYS-02 | UI conventions | Loading, empty and error states on every screen; server rejection reasons shown in plain language. | NFR-07 | S1 (Issue #13) | S1 (selected E2E tests) |

## 3. Notes

- A requirement split across several features lists the relevant part in parentheses, for example BR-03 (access part) for F-02 and BR-03 (checkout part) for F-05. Each part gets its own acceptance criterion in the feature contracts.
- BR-08 is split by sprint: adding an item is F-03 (S1), editing is F-10 (S2).
- Features of Sprints 2 and 3 are not yet elaborated into acceptance criteria and executable tests; they receive contracts before their implementation.

## 4. Change history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial feature inventory F-01 to F-13, SYS-01, SYS-02 | Baptiste |