# Software Requirements Specification (SRS)

**Product:** Equipment Inventory and Borrowing System (Theme 2)
**Course:** CPE 334, Semester 1/2026
**Team:** DUBROEUCQ Baptiste [69540460002] and LEPOUTRE Léo [69540460045]
**Repository:** https://github.com/Bptdbr/cpe334-inventory-borrowing
**Related Issue:** #2
**Version:** 1.0 (baseline for Deliverable 1)
**Last updated:** 03/11/2026

---

## 1. Purpose and context

### 1.1 Stakeholder problem

A university department owns shared equipment (cameras, laptops, microcontroller kits, measurement instruments) that students and staff need to borrow. Today, who has which item is tracked informally, so equipment is double-promised, lost, or returned late, and nobody can quickly see what is available.

### 1.2 Product goal

Provide a web application where **borrowers** can see which equipment is available and request it, and **custodians** (the people responsible for the equipment) can maintain the catalog and control checkout and return. The finished product handles availability, borrowing, return, overdue status and inventory reporting.

### 1.3 Chosen context

A **department equipment loan desk**. Equipment is tracked as **individual physical copies** (decision D-01). Each copy has a unique asset tag and one responsible custodian (decision D-03).

### 1.4 Product plan in three sprints

| Sprint | Goal | Checkpoint |
|---|---|---|
| 1 | Authentication, authorization, catalog, borrow request, checkout, consultation | Deliverable 1, 8 Nov 2026 |
| 2 | Return, due dates, overdue status, request cancellation, item maintenance | Deliverable 2, 29 Nov 2026 |
| 3 | Search and filtering, inventory reports, hardening, usability, failure handling | Final delivery, 13 Dec 2026 |

---

## 2. Actors and responsibilities

| Actor | Description | Main responsibilities |
|---|---|---|
| **Borrower** | A student or staff member who borrows equipment. Authenticated, role `BORROWER`. | Browse the catalog, request an available item, view their own requests and loans, cancel their own pending request (S2), search the catalog (S3). |
| **Custodian** | Equipment administrator responsible for a set of items. Authenticated, role `CUSTODIAN`. | Maintain the catalog of the items they manage, view requests and loans for those items, record checkout (S1) and return (S2), see overdue loans and inventory summaries (S3). |
| **System** | The application itself acting automatically. | Compute overdue status from due dates (S2), enforce business rules and permissions on the backend. |

There is no global administrator in this product. Accounts are created by a seed procedure (decision D-12).

---

## 3. Scope and exclusions

### 3.1 In scope

- Authentication (login, logout, current user) and role-based authorization enforced by the backend.
- Catalog of individually tracked items with availability status and a responsible custodian.
- Borrow requests, checkout creating an active loan, return, due dates, overdue status.
- Search, filtering and inventory summary reports.
- Persistent storage with documented schema, migrations and reproducible demo data.
- Packaging suitable for Docker and deployment on GCP (delivered in Lab 5).

### 3.2 Out of scope (explicit exclusions)

| Exclusion | Reason |
|---|---|
| Self-registration, password recovery, email verification, advanced account administration | Not required by the course specification (D-12). |
| Quantity-based stock tracking | Individual copies were chosen (D-01). |
| Approval workflow for requests in Sprint 1 | Deferred (D-02). May be revisited in Sprint 2. |
| Walk-up checkout without a prior request | Checkout always starts from a request (D-06). |
| Fees, fines, payments, deposits | No payment functionality required. |
| Email, SMS or other external notifications | No external messaging service required. |
| Reservations for future dates | Not part of the theme brief. |
| Multiple roles per account | Not required. |
| Real personal data | Only synthetic data is used. |

---

## 4. Assumptions and constraints

| ID | Assumption or constraint |
|---|---|
| A-01 | Every item is a single physical copy and can be held by at most one borrower at a time. |
| A-02 | Each item has exactly one responsible custodian (`managed_by`). |
| A-03 | Users and demo data are created by a seed script: 2 borrowers, 2 custodians, a small catalog. |
| A-04 | Passwords are managed locally and stored only as salted hashes. |
| A-05 | All dates and times are stored in UTC. |
| A-06 | The application runs locally with documented setup and must be suitable for containerization (configuration by environment variables, durable database, no state in process memory). |
| A-07 | The technology stack is documented in the system-level SDS (Part C). |
| A-08 | A rejected checkout leaves the request in `PENDING` (open question Q-03). |

Decisions behind these assumptions are recorded in `docs/decisions.md`.

---

## 5. Domain glossary

| Term | Meaning |
|---|---|
| Item | One physical, individually tracked piece of equipment. |
| Asset tag | Unique identifier printed on an item. |
| Borrow request | A borrower's request for one item. Status `PENDING` or `FULFILLED` (Sprint 1). |
| Checkout | Custodian action that hands an item to the borrower and creates an active loan. |
| Loan | A record of an item held by a borrower. Status `ACTIVE` (Sprint 1); `RETURNED` and `OVERDUE` from Sprint 2. |
| Managing custodian | The custodian recorded in `managed_by` for an item. |

### State summary

- `Item.status`: `AVAILABLE`, `ON_LOAN` (Sprint 2 adds `MAINTENANCE`, `RETIRED`).
- `LoanRequest.status`: `PENDING` → `FULFILLED` (Sprint 2 adds `CANCELLED`).
- `Loan.status`: `ACTIVE` (Sprint 2 adds `RETURNED`; `OVERDUE` is derived or stored according to the Sprint 2 design).

---

## 6. Functional requirements (FR)

Sprint column: S1, S2 or S3 = sprint in which the requirement is implemented and verified.

### 6.1 Authentication and identity

| ID | Requirement | Actor | Sprint |
|---|---|---|---|
| FR-01 | The system shall allow a user to log in with a username and password, and shall reject invalid credentials with an error that does not reveal which part was wrong. | Borrower, Custodian | S1 |
| FR-02 | The system shall allow a logged-in user to log out, after which the session or token can no longer be used to access protected data. | Borrower, Custodian | S1 |
| FR-03 | The system shall return the identity and role of the currently authenticated user. | Borrower, Custodian | S1 |

### 6.2 Catalog

| ID | Requirement | Actor | Sprint |
|---|---|---|---|
| FR-04 | The system shall display the catalog of all items with their asset tag, name, description and availability status. | Borrower, Custodian | S1 |
| FR-05 | The system shall allow a custodian to add an item to the catalog; the item is assigned to that custodian as managing custodian and starts as `AVAILABLE`. | Custodian | S1 |
| FR-11 | The system shall allow the managing custodian to edit an item's name and description, and to retire an item that is not currently on loan. | Custodian | S2 |
| FR-15 | The system shall allow users to search the catalog by name or asset tag and to filter by availability status. | Borrower, Custodian | S3 |

### 6.3 Borrow requests

| ID | Requirement | Actor | Sprint |
|---|---|---|---|
| FR-06 | The system shall allow a borrower to submit a request for one `AVAILABLE` item, creating a `PENDING` request linked to that borrower. | Borrower | S1 |
| FR-07 | The system shall allow a borrower to view their own requests and loans with their current status. | Borrower | S1 |
| FR-08 | The system shall allow a custodian to view the requests concerning the items they manage. | Custodian | S1 |
| FR-12 | The system shall allow a borrower to cancel their own `PENDING` request. | Borrower | S2 |

### 6.4 Checkout, loans and return

| ID | Requirement | Actor | Sprint |
|---|---|---|---|
| FR-09 | The system shall allow the managing custodian to check out a `PENDING` request, which creates an `ACTIVE` loan, sets the request to `FULFILLED` and sets the item to `ON_LOAN`, as one atomic operation. | Custodian | S1 |
| FR-17 | The system shall allow a custodian to view the active loans of the items they manage. | Custodian | S1 |
| FR-10 | The system shall allow the managing custodian to record the return of an item on loan, which closes the loan and sets the item to `AVAILABLE`. | Custodian | S2 |
| FR-13 | The system shall record a due date when a checkout is made, according to a default loan period defined in the SRS update for Sprint 2. | Custodian, System | S2 |
| FR-14 | The system shall flag a loan as overdue when the current date passes its due date and the item has not been returned, and shall show overdue loans to the custodian and to the borrower concerned. | System | S2 |

### 6.5 Reporting

| ID | Requirement | Actor | Sprint |
|---|---|---|---|
| FR-16 | The system shall provide a custodian with an inventory summary (counts of available, on-loan and overdue items) and the list of overdue loans for the items they manage. | Custodian | S3 |

### 6.6 Data setup

| ID | Requirement | Actor | Sprint |
|---|---|---|---|
| FR-18 | The system shall provide a documented, repeatable seed procedure that creates the demo accounts (2 borrowers, 2 custodians) and a small synthetic catalog. | Team / Developers | S1 |

---

## 7. Business rules (BR)

| ID | Rule | Related FR | Sprint | Verification |
|---|---|---|---|---|
| BR-01 | An item shall have at most one `ACTIVE` loan at any time. | FR-09 | S1 | Integration test; database constraint |
| BR-02 | Only an item with status `AVAILABLE` may be requested or checked out. A request or checkout for any other item is rejected with 409 and changes nothing. | FR-06, FR-09 | S1 | Integration test |
| BR-03 | Only the managing custodian of an item may check it out, and may only see requests and loans of the items they manage. | FR-08, FR-09, FR-17 | S1 | Integration test (role and ownership) |
| BR-04 | A borrower may only see and act on their own requests and loans. Access to another borrower's record returns 404 and no private data. | FR-07 | S1 | Integration test |
| BR-05 | Two concurrent checkouts of the same item shall never produce two `ACTIVE` loans: exactly one succeeds and the other is rejected with 409. | FR-09 | S1 | Concurrency integration test |
| BR-06 | A borrower may not hold two `PENDING` requests for the same item. The second request is rejected with 409. | FR-06 | S1 | Integration test |
| BR-07 | Only a `PENDING` request may be checked out, and at most once. A `FULFILLED` request cannot be checked out again. | FR-09 | S1 | Integration test |
| BR-08 | Only the managing custodian may create catalog changes to an item; a custodian cannot modify or add items on behalf of another custodian. | FR-05, FR-11 | S1 (add), S2 (edit) | Integration test |
| BR-09 | Recording a return closes the loan and makes the item `AVAILABLE`; an item that is not on loan cannot be returned. | FR-10 | S2 | Unit and integration test |
| BR-10 | A loan is overdue if and only if its due date has passed and it has not been returned. | FR-13, FR-14 | S2 | Unit test with controlled clock |
| BR-11 | A borrower may only cancel their own request, and only while it is `PENDING`. | FR-12 | S2 | Integration test |
| BR-12 | A retired item cannot be requested, and an item currently on loan cannot be retired. | FR-11 | S2 | Integration test |

---

## 8. Non-functional requirements (NFR)

Each NFR has a measurable target, a verification method and the sprint that establishes and verifies it.

| ID | Category | Requirement and target | Verification | Sprint |
|---|---|---|---|---|
| NFR-01 | Security | An unauthenticated request to any protected endpoint is rejected with 401 and the response contains no private data. | Automated API test over every protected endpoint | S1 |
| NFR-02 | Security | No password is stored in plain text; stored credentials are salted hashes produced by a standard password-hashing algorithm. | Test that the stored value differs from the password and matches the hash format; schema inspection | S1 |
| NFR-03 | Reliability | All data persists across an application restart; no domain data is held only in process memory. | Integration test: create data, restart application, read data | S1 |
| NFR-04 | Portability | All configuration (database location, secrets, session settings) is supplied by environment variables; no secret is committed; a `.env.example` documents every variable. | Repository inspection; clean-clone setup run from README | S1 |
| NFR-05 | Security | Error responses do not expose stack traces, SQL errors or internal paths. | API test that triggers errors and inspects the response body | S1 |
| NFR-06 | Security | A session or token expires after a defined period (default: 60 minutes) and an expired one is rejected with 401. | Test with controlled clock or short expiry in test configuration | S1 |
| NFR-07 | Usability | Each screen shows a distinct loading, empty and error state, and displays the server's rejection reason in plain language. | UI/E2E test on selected screens | S1 |
| NFR-08 | Maintainability | Every FR and BR is traceable to a feature, acceptance criterion and test. | Traceability matrix review | S1 (baseline), S2, S3 |
| NFR-09 | Performance | Listing a catalog of 500 items returns in under 500 ms on the development machine. | Simple timed API test with seeded data | S3 |
| NFR-10 | Deployability | The application builds and runs from a clean checkout using documented commands only, and is ready for Docker packaging. | README run-through; container build in Lab 5 | S1 (design), Lab 5 |
| NFR-11 | Accessibility | Primary text and controls meet WCAG 2.1 AA contrast requirements. | Contrast check on the defined palette | S3 |

---

## 9. Role and access summary

The complete role/permission matrix is defined in the system-level SDS. The requirements-level summary is:

| Capability | Anonymous | Borrower | Custodian |
|---|---|---|---|
| Log in | Yes | n/a | n/a |
| View catalog | No | Yes | Yes |
| Add an item | No | No | Yes (becomes managing custodian) |
| Request an item | No | Yes (for themselves) | No |
| View own requests and loans | No | Yes (own only) | No |
| View requests and loans of managed items | No | No | Yes (managed items only) |
| Check out a request | No | No | Yes (managed items only) |

Response convention (D-07): **401** unauthenticated, **403** role not allowed for the operation, **404** the record exists but is outside the user's scope, **409** conflict with the current state, **422** invalid input.

---

## 10. Acceptance and traceability

- Every requirement above has a stable ID and is allocated to a sprint.
- `docs/features.md` groups requirements into features (F-01 to F-06 for Sprint 1, later features for Sprints 2 and 3).
- `docs/traceability.md` maps FR/BR/NFR → feature → sprint → acceptance criterion → test.
- Sprint 1 acceptance criteria and tests are defined in the feature engineering contracts under `docs/sprints/sprint-1/`.
- Requirements allocated to Sprints 2 and 3 are not yet elaborated into acceptance criteria and executable tests; this is intentional and shown as such in the traceability matrix.

### Sprint allocation summary

| Sprint | Functional requirements | Business rules | Non-functional requirements |
|---|---|---|---|
| S1 | FR-01 to FR-09, FR-17, FR-18 | BR-01 to BR-08 (BR-08 add only) | NFR-01 to NFR-08, NFR-10 (design) |
| S2 | FR-10 to FR-14 | BR-08 (edit), BR-09 to BR-12 | NFR-08 (updates) |
| S3 | FR-15, FR-16 | n/a | NFR-09, NFR-11, NFR-08 (final) |

---

## 11. Decisions and open questions

Decisions D-01 to D-13 and open questions Q-01 to Q-03 are recorded in `docs/decisions.md`. Q-01 is resolved; requirements that depend on a still-open question are noted in their rows (see A-08).

---

## 12. Change history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 03/11/2026 | Initial baseline: FR-01 to FR-18, BR-01 to BR-12, NFR-01 to NFR-11 | Léo |

Requirement IDs are stable. A requirement that changes is revised in place with a new row in this history; a requirement that is dropped is marked `Withdrawn`, never renumbered.
