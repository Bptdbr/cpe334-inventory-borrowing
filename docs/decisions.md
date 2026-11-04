# Decision Log

**Project:** Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026
**Team:** DUBROEUCQ Baptiste [69540460002] and LEPOUTRE Léo [69540460045]
**Related Issue:** #2 (Theme decisions and SRS)
**Document version:** 1.1 (draft for PR review)
**Last updated:** 03/11/2026

This log records every significant product and design decision, its alternatives, and the reason it was taken. Decisions are never silently rewritten: if a decision changes, a new row is added and the old one is marked `Superseded`.

**Status values:** `Accepted` (agreed by both students), `To confirm` (accepted provisionally, awaiting resolution of an open question), `Superseded`.

---

## 1. Decisions

| ID | Question | Options considered | Decision | Rationale | Date | Participants | Status |
|---|---|---|---|---|---|---|---|
| D-01 | Do we track individual copies or quantities? | (a) Individual copies, one item = one physical unit. (b) Quantities per catalog entry. | **(a) Individual copies.** Each item is an exclusive physical unit identified by a unique `asset_tag`. | Makes the "no duplicate active loan for an exclusive item" rule simple to specify and test. Quantity tracking needs stock counters and more complex concurrency rules. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-02 | Do borrow requests require approval? | (a) Approval step before checkout. (b) No approval: the custodian's checkout fulfills the request directly. | **(b) No approval in Sprint 1.** Flow: `PENDING` → checkout by custodian → `FULFILLED`, creating an `ACTIVE` loan. Approval is introduced in Sprint 2 (see D-15). | Keeps Sprint 1 minimal but complete (authentication, authorization, persistence, domain transition, tested rule). The checkout by a custodian is itself the control point. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-03 | What does "authorized inventory" mean for a custodian? | (a) Every custodian manages all items. (b) Each item has one responsible custodian. | **(b) Each item has a `managed_by` custodian.** A custodian can only manage items and loans of items they are responsible for. The seed contains two custodians. | Gives a real ownership restriction to test (a custodian must not act on another custodian's inventory), as required by the theme's access rules. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-04 | How do we guarantee that two active loans cannot exist for one item, including under concurrency? | (a) Application-level check only. (b) Database constraint plus transaction. | **(b)** Partial unique index on `loans(item_id) WHERE status = 'ACTIVE'` plus a transaction that re-checks item availability at checkout. | An application check alone is vulnerable to race conditions. The database constraint is the last line of defense, and a concurrent-checkout test can prove it. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-05 | Can a borrower hold several `PENDING` requests for the same item? | (a) Yes. (b) No, at most one `PENDING` request per borrower per item. | **(b) No.** A second request for the same item while one is `PENDING` is rejected with 409. | Prevents duplicate requests and gives a clear, testable business rule (BR-06). | 03/11/2026 | Baptiste, Léo | Accepted |
| D-06 | Can a custodian check out an item without a prior request? | (a) Yes, direct checkout for a chosen borrower. (b) No, checkout starts from a `PENDING` request. | **(b) No.** Checkout always starts from a `PENDING` request of an item the custodian manages. Walk-up checkout is out of scope. | Keeps one single, traceable workflow and avoids a second code path in Sprint 1. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-07 | When a user accesses another user's resource, do we return 403 or 404? | (a) 403 Forbidden. (b) 404 Not Found. | **Rule:** 401 for unauthenticated requests; 403 when the role is not allowed for the operation (e.g. a borrower calls checkout); **404** when the role is allowed but the specific record belongs to someone else or is outside the user's scope (e.g. another borrower's request). | 404 does not reveal that the record exists, which protects private data. Using the two codes consistently makes API tests unambiguous. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-08 | What does the catalog show to a borrower? | (a) Only available items. (b) All items with their status. | **(b) All items with their status** (`AVAILABLE` or `ON_LOAN`). The catalog does not expose who currently holds an item. | Lets the borrower see the system state and lets us test rejection of requests for unavailable items without hiding data. Borrower identity of other users stays private. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-09 | Which fields does an item have? | (a) Minimal (name only). (b) Identification, description, status, owner. | **(b)** `asset_tag` (unique), `name`, `description`, `status`, `managed_by`, `created_at`. | Enough for identification, ownership and availability rules without over-engineering. Categories and search fields are added in Sprint 3. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-10 | Which language do we use for project documents and code? | French or English. | **English** for all documents, code, API names and test names. | The course specification is written in English. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-11 | What is deferred to Sprints 2 and 3? | n/a | **Sprint 2:** item return, due date, overdue status, request cancellation, item edit/retire. **Sprint 3:** search and filtering, inventory summaries and reports, hardening, usability and failure handling. | Sprint 1 only delivers the minimal vertical slice defined by the theme. Later features still have requirements and a sprint allocation now. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-12 | How are accounts created? | (a) Self-registration. (b) Seeded demo accounts. | **(b) Seeded demo accounts only** (2 borrowers, 2 custodians). Self-registration, password recovery and email verification are excluded. | Explicitly sufficient according to the course specification. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-13 | Which concrete context do we model? | Several (equipment lab, library, sports gear...). | **A university department equipment loan desk** (e.g. cameras, laptops, microcontroller kits) lent to students and staff. | Concrete, easy to seed with realistic synthetic data, and natural for the Borrower / Custodian roles. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-14 | Which authentication mechanism and token lifetime? | (a) Server-side session cookie. (b) Signed token (JWT). | **(b) Signed token** sent in the `Authorization: Bearer` header. Lifetime **60 minutes** (NFR-06). | Stateless API, easy to test, suitable for containers. Resolves Q-02. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-15 | When is the approval of requests introduced? | (a) Never. (b) Sprint 2. | **(b) Sprint 2.** Request statuses gain `APPROVED` and `REJECTED`, and checkout then starts from an `APPROVED` request. Sprint 1 has no approval step. | The product baseline includes approval, while Sprint 1 stays a minimal vertical slice. Supersedes the open wording of D-02. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-16 | Do the `MAINTENANCE` item status and item categories stay in the product? | (a) Remove. (b) Keep. | **(b) Keep.** `MAINTENANCE` in Sprint 2, categories in Sprint 3. | They belong to the full product and are allocated to later sprints. | 03/11/2026 | Baptiste, Léo | Accepted |
| D-17 | Technology stack. | Several. | **TypeScript, Node.js, Express, React with Vite, PostgreSQL 16, Prisma, Zod, Vitest, Supertest, Playwright** (details in the system-level SDS, section 3). | One language across the stack, same family of tools as Labs 1 to 4, PostgreSQL supports the partial unique indexes required by D-04. | 03/11/2026 | Baptiste, Léo | To confirm (Express, Vite, Zod and the test tools are proposals to be validated during the review of the SDS) |
| D-18 | How is logout implemented with a signed token? | (a) Client deletes the token only. (b) Server records the token identifier (`jti`) as revoked until it expires. | **(b)** A `revoked_tokens` table stores revoked identifiers until natural expiry. | A signed token cannot otherwise be invalidated, and FR-02 requires the token to be unusable after logout. | 03/11/2026 | Baptiste, Léo | To confirm (during the review of the SDS) |

---

## 2. Open questions

| ID | Question | Owner | Asked on | Answer / resolution |
|---|---|---|---|---|
| Q-01 | Is the per-item `managed_by` interpretation of "authorized inventory" (D-03) the right one for this product? | Baptiste, Léo | 03/11/2026 | Resolved: accepted by the team as D-03 |
| Q-02 | Session mechanism (server session cookie vs signed token) and expiry duration. | Baptiste, Léo | 03/11/2026 | Resolved: signed token, 60 minutes (D-14); logout by token revocation (D-18) |
| Q-03 | Should a rejected checkout leave the request `PENDING` (current assumption) or move it to another state? | Baptiste, Léo | 03/11/2026 | Assumption: it stays `PENDING`. Revisit in Sprint 2 when request rejection is introduced |

---

## 3. Change history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 03/11/2026 | Initial decisions D-01 to D-13 recorded | Léo |
| 1.1 | 03/11/2026 | Added D-14 to D-18; D-02 wording aligned with D-15; Q-02 resolved | Léo |
