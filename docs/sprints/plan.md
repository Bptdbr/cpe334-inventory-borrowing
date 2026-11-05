# Three-Sprint Plan

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026  
**Related Issue:** #3  
**Version:** 1.1  
**Last updated:** 2026-11-05  

The plan covers the whole product baseline of `docs/srs.md`. Feature IDs come from `docs/features.md`; requirement coverage is shown in `docs/traceability.md`. The allocation of Sprints 2 and 3 follows decision D-11 and the SRS, and is provisional until reviewed at the start of Sprint 2. Any change is recorded in section 6.

## 1. Overview

| Sprint | Goal | Features | Checkpoint |
|---|---|---|---|
| 1 | Small working vertical slice with authentication, permissions and persistence | F-01 to F-06, SYS-01 (baseline), SYS-02 | Deliverable 1, 8 Nov 2026 |
| 2 | Core expansion: return, due dates, overdue status, request cancellation, item maintenance, request approval | F-07 to F-10, F-14 | Deliverable 2, 29 Nov 2026 |
| 3 | Completion and hardening: search, categories, reports, accessibility, failure handling | F-11 to F-13 | Progress at 29 Nov 2026, complete by 13 Dec 2026 (final delivery) |

Together the three sprints cover every feature of the inventory (F-01 to F-14) and every system responsibility (SYS-01, SYS-02).

## 2. Sprint 1: working vertical slice (due 8 Nov 2026)

**Goal:** a borrower requests an available item, a custodian checks it out, and both see the persisted result, under real authentication and backend authorization.

**Features and requirements**

| Feature | Requirements |
|---|---|
| F-01 Authentication | FR-01, FR-02, FR-03, NFR-02, NFR-06 |
| F-02 Authorization and ownership | BR-03 (access), BR-04, NFR-01, NFR-05 |
| F-03 Catalog and seed data | FR-04, FR-05, FR-18, BR-08 (add), NFR-03 |
| F-04 Borrow request | FR-06, BR-02 (request), BR-06 |
| F-05 Checkout | FR-09, BR-01, BR-02 (checkout), BR-03 (checkout), BR-05, BR-07 |
| F-06 Consultation | FR-07, FR-08, FR-17, BR-03 (visibility), BR-04 |
| SYS-01, SYS-02 | NFR-04, NFR-07, NFR-08, NFR-10 (design) |

**Dependencies (build order):** F-01 → F-02 → F-03 → F-04 → F-05 → F-06. The database (Issue #9) and the authentication middleware (Issue #10) come before the domain APIs (Issues #11 and #12). The UI (Issues #13 and #14) can start from the API contracts.

**Why this scope is feasible:** it is the minimal slice required by the course (login, two roles, catalog, request, checkout, rejection of an unavailable item and of a duplicate active loan, concurrency test). Return, due dates, overdue status, cancellation, maintenance, search and reports are deferred (D-05, D-11) so that the contracts, tests and evidence of Sprint 1 can be complete.

**Completion outcome**
- A release on `main`, tagged `v1.0-sprint1`, that runs locally with documented setup.
- Normal journey, one rule rejection and one forbidden operation demonstrated through UI, API and database.
- Automated tests for domain rules, persistence, authentication and access restrictions, plus selected end-to-end journeys.
- Reviewed Issues and PRs through `sprint-1-staging`.

**Engineering work items:** Issues #1 to #16 (setup, SRS, features and plan, system SDS, three feature contracts, database, backend, APIs, UI, integration and release, evidence PDF).

**Scope reduction rule:** if time runs short, reduce UI screens first, never the contracts or the tests.

## 3. Sprint 2: core expansion (due 29 Nov 2026)

**Goal:** complete the loan lifecycle (return, due date, overdue), borrower and custodian maintenance operations, and request approval.

| Feature | Requirements | Depends on |
|---|---|---|
| F-07 Item return | FR-10, BR-09 | F-05 |
| F-08 Due date and overdue status | FR-13, FR-14, BR-10 | F-05, F-07 |
| F-09 Request cancellation | FR-12, BR-11 | F-04 |
| F-10 Item maintenance | FR-11, FR-20, BR-08 (edit), BR-12 | F-03 (and an update of F-04 for retired items) |
| F-14 Request approval and rejection | FR-19, BR-13 | F-04 |

**Dependencies and prerequisites:** the Sprint 1 release; the default loan period decided in the Sprint 2 SRS update (gap G-04); the stored or derived overdue decision (gap G-05).

**Completion outcome:** all Sprint 2 features complete under contracts written before implementation, integrated, tested (including regression of Sprint 1), reviewed, and released for Deliverable 2.

## 4. Sprint 3: completion and hardening (progress 29 Nov, complete 13 Dec 2026)

**Goal:** finish the product, harden it and verify it.

| Feature | Requirements | Depends on |
|---|---|---|
| F-11 Catalog search, categories and filtering | FR-15, FR-21, NFR-09 | F-03 |
| F-12 Inventory summary and overdue report | FR-16 | F-08 |
| F-13 Hardening and accessibility | NFR-11, failure handling, usability, regression | All |

**Completion outcome:**
- By 29 Nov: Sprint 3 contracts, demonstrated working progress and an explicit remaining-work list.
- By 13 Dec: all features complete, regression tests passing, defects from UAT corrected, deployed final release.

## 5. Non-sprint work in the course schedule

| Date | Activity | Relation to the plan |
|---|---|---|
| 15 Nov 2026 | Lab 5: Docker, CI/CD and GCP deployment | Uses the Sprint 1 release. The design is already container-ready (NFR-04, NFR-10). |
| 22 Nov 2026 | Lab 6: cross-team UAT and defect management | Tests a recorded release; defect fixes are kept separate from feature work. |
| 29 Nov 2026 | Lab 7: maintenance, metrics, release readiness | Needs a change to an already implemented behavior, not a backlog feature. The change is tracked separately. |

Lab work happens alongside Sprint 2, so its Issues and PRs are labelled and identified separately from feature Issues.

## 6. Plan risks and change history

| Risk | Mitigation |
|---|---|
| Sprint 1 is very busy on 7 and 8 Nov. | Contracts first, UI last; reduce screens rather than tests. |
| Sprint 2 overlaps with Labs 5 to 7. | Keep Sprint 2 to five features and write contracts early. |
| Open questions (Q-02, Q-03, G-04, G-05) delay a contract. | Each is decided before the contract that depends on it. |

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-03 | Initial three-sprint plan | Baptiste |
| 1.1 | 2026-11-05 | Added F-14 (FR-19, BR-13); allocated FR-20, FR-21; removed instructor wording | Léo |
