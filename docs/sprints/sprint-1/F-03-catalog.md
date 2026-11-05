# Feature Contract F-03: Catalog and Seed Data

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026  
**Related Issue:** #7  
**Feature:** F-03 Catalog and seed data  
**Requirements:** FR-04, FR-05, FR-18, BR-08 (add part), NFR-03 (supports NFR-04, NFR-08, NFR-10)  
**Decisions:** D-01, D-03, D-07, D-08, D-09, D-12, D-17  
**Version:** 1.0 (written before implementation)  
**Last updated:** 2026-11-05  
**Author:** Léo (Student B, ID 69540460045)  

The detailed design is in `docs/system-sds.md` (sections 5, 7, 8, 10 and 11). This contract defines the observable behavior, API specifications, acceptance criteria (AC-20 to AC-28), and the software test specification (TEST-31 to TEST-45) for F-03.

---

## 1. Objective and scope

Feature F-03 provides the inventory catalog of individual equipment items, allows custodians to add new items under their management, provides an idempotent synthetic seed procedure for demonstrations and automated tests, and guarantees data persistence across application restarts.

| In scope | Out of scope |
|---|---|
| View entire catalog with availability status (FR-04) | Search by keyword and category filtering (F-11, Sprint 3) |
| Custodian adds a new item starting as `AVAILABLE` (FR-05, BR-08) | Editing item details or retiring an item (F-10, Sprint 2) |
| Managing custodian assignment (`managed_by` = caller) (D-03, BR-08) | Setting an item to `MAINTENANCE` status (FR-20, Sprint 2) |
| Duplicate asset tag rejection (409 `DUPLICATE_ASSET_TAG`) (D-07) | Bulk item import or barcode/QR scanner integration |
| Seed script with 2 borrowers, 2 custodians, 8 items, 1 on-loan item (FR-18) | Item deletion or physical tracking / RFID |
| Idempotency of database seed runs (FR-18) | Tracking borrower identity in the public catalog (forbidden by D-08) |
| Relational data persistence in PostgreSQL across restarts (NFR-03) | |

Dependencies: F-01 (Authentication) and F-02 (Authorization) provide caller identity and role checks. F-04 (Borrow request) and F-05 (Checkout) depend on F-03.

---

## 2. Workflow

### 2.1 Viewing the catalog (FR-04, D-08)
1. Any authenticated user (Borrower or Custodian) navigates to `/items` or calls `GET /api/items`.
2. The API authenticates the request via JWT Bearer token (F-01).
3. The catalog service queries PostgreSQL for all items ordered by creation time or asset tag.
4. The API returns an array of items containing `id`, `assetTag`, `name`, `description`, `status`, `managedBy`, and `createdAt`.
5. Under decision D-08, the response never includes borrower identity, loan details, or personal information.

### 2.2 Adding an item (FR-05, BR-08)
1. An authenticated custodian submits a new item via `POST /api/items` with payload `{ assetTag, name, description }`.
2. The auth middleware verifies the token; the role middleware enforces `Role.CUSTODIAN` (borrowers receive 403 `FORBIDDEN_ROLE`).
3. The route layer validates inputs using Zod (422 `VALIDATION_ERROR` if validation fails).
4. The service sets `managed_by` to the authenticated custodian's user ID extracted from the token (client-supplied ownership is ignored, AC-15).
5. The service sets initial `status` to `AVAILABLE`.
6. The service checks uniqueness of `asset_tag` (database unique constraint). If a conflict occurs, returns 409 `DUPLICATE_ASSET_TAG`.
7. On success, the API returns 201 with the created item resource.

### 2.3 Executing demo and test seed (FR-18)
1. The developer or automated test runner executes `npm run db:seed`.
2. The seed script connects to PostgreSQL using `DATABASE_URL` and reads `SEED_DEMO_PASSWORD`.
3. The script hashes the password with argon2id and performs upserts for:
   - 2 borrowers (`borrower1`, `borrower2`)
   - 2 custodians (`custodian1`, `custodian2`)
   - 8 individual items (tags `EQ-001` through `EQ-008`), 4 assigned to `custodian1`, 4 assigned to `custodian2`.
   - 1 initial active loan on `EQ-001` (borrowed by `borrower1`, checked out by `custodian1`, with request `FULFILLED` and item `ON_LOAN`).
4. Re-running `npm run db:seed` produces no errors, no duplicates, and leaves the dataset consistent.

### 2.4 Data persistence (NFR-03)
1. All domain data is committed to PostgreSQL disk storage.
2. Stopping the Node.js API server process and restarting it leaves all items, users, and statuses intact.

---

## 3. Business rules, validation and boundaries

| Rule | Detail |
|---|---|
| Single physical unit (D-01) | Each record represents one unique physical item identified by its `asset_tag`. |
| Managing custodian assignment (D-03, BR-08) | When creating an item, `managed_by` is strictly set to the authenticated custodian's ID. Borrowers cannot add items (403). |
| Initial status (FR-05) | Every newly added item starts with status `AVAILABLE`. |
| Unique asset tag | `asset_tag` must be globally unique across all items. Duplicates return 409 `DUPLICATE_ASSET_TAG`. |
| Privacy of item holder (D-08) | The catalog view exposes item availability (`AVAILABLE` vs `ON_LOAN`), but never exposes who has borrowed the item. |
| Persistence (NFR-03) | All state resides in PostgreSQL. In-memory data structures are not used for storage. |
| Repeatable seed (FR-18) | Seed execution is idempotent: upserts on `users(username)` and `items(asset_tag)`, conditional loan insertion. |
| Field limits | `assetTag`: 1 to 30 characters, trimmed, required. `name`: 1 to 100 characters, trimmed, required. `description`: string, max 1000 characters, optional (defaults to empty string). |

---

## 4. Data

F-03 uses the `items` and `users` tables defined in `docs/system-sds.md` (section 5.2).

### `items` schema summary
- `id`: UUID, primary key, default `gen_random_uuid()`.
- `asset_tag`: VARCHAR(30), NOT NULL, UNIQUE.
- `name`: VARCHAR(100), NOT NULL.
- `description`: TEXT, NOT NULL, default `""`.
- `status`: ENUM `ItemStatus` (`AVAILABLE`, `ON_LOAN`), NOT NULL, default `AVAILABLE`.
- `managed_by`: UUID, NOT NULL, FK → `users(id)` ON DELETE RESTRICT.
- `created_at`: TIMESTAMPTZ, NOT NULL, default `now()`.

Foreign key guarantee: `managed_by` must reference an existing user with role `CUSTODIAN`.

---

## 5. API

All error responses strictly follow the uniform error format: `{ "error": { "code": "...", "message": "..." } }`.

### 5.1 GET /api/items

Retrieves the entire equipment catalog.

**Headers:** `Authorization: Bearer <token>` (Required)

| Outcome | Status | Body |
|---|---|---|
| Success | 200 | Array of item objects: `[ { "id": "<uuid>", "assetTag": "EQ-001", "name": "Digital Oscilloscope", "description": "100MHz 2-channel", "status": "AVAILABLE", "managedBy": "<uuid>", "createdAt": "<ISO-8601>" }, ... ]` |
| Unauthenticated | 401 | `UNAUTHENTICATED` |

Note: If the catalog is empty, returns 200 with `[]`.

### 5.2 POST /api/items

Adds a new equipment item to the inventory under the caller's management.

**Headers:** `Authorization: Bearer <token>` (Required, Custodian only)  
**Request body:**

```json
{
  "assetTag": "EQ-009",
  "name": "Soldering Station",
  "description": "Temperature controlled 60W"
}
```

| Outcome | Status | Code | Message / Body |
|---|---|---|---|
| Created | 201 | - | Item object with `status: "AVAILABLE"` and `managedBy` set to caller |
| Missing/invalid token | 401 | `UNAUTHENTICATED` | "Authentication required" |
| Caller is BORROWER | 403 | `FORBIDDEN_ROLE` | "Custodian role required" |
| Duplicate asset tag | 409 | `DUPLICATE_ASSET_TAG` | "An item with this asset tag already exists" |
| Invalid inputs (missing fields, too long) | 422 | `VALIDATION_ERROR` | Validation error with `details` |

---

## 6. UI

| Screen | Behavior |
|---|---|
| Catalog screen (`/items`) | Accessible to both Borrowers and Custodians. Displays items in a structured list/table with columns: Asset Tag, Name, Description, Status (`AVAILABLE` / `ON_LOAN`), and Managing Custodian identifier. Status is indicated with a text badge (never color alone, NFR-07/NFR-11). Holder name is never shown. |
| Add Item button/modal | Visible **only** to logged-in Custodians on `/items`. Form fields: Asset Tag, Item Name, Description. Submit button is disabled while the POST request is in flight. |
| Add Item feedback | On 201: dialog closes, catalog automatically updates, success toast/banner displayed. On 409: inline error "An item with this asset tag already exists". On 422: field-specific validation errors. |
| States | Loading spinner while catalog loads; Empty state "No items in catalog" if list is empty; Error state with retry button if fetch fails. |

---

## 7. Permissions

| Operation | Anonymous | Borrower | Custodian | Scope / Notes |
|---|---|---|---|---|
| `GET /api/items` | 401 | Allowed | Allowed | Returns all items; borrower privacy protected (D-08) |
| `POST /api/items` | 401 | 403 | Allowed | New item automatically bound to caller (`managed_by`) |

---

## 8. Acceptance criteria

| AC | Requirement | Expected observable outcome |
|---|---|---|
| **AC-20** | FR-04, D-08 | `GET /api/items` with a valid token returns 200 and all items with `id`, `assetTag`, `name`, `description`, `status`, `managedBy`, and `createdAt`. No holder identity, borrower name, or loan details are included. |
| **AC-21** | FR-05, BR-08 | A custodian calling `POST /api/items` with valid data creates an item with status `AVAILABLE` and `managedBy` equal to the custodian's user ID, returning 201. |
| **AC-22** | BR-08, NFR-01 | A borrower calling `POST /api/items` receives 403 `FORBIDDEN_ROLE` and no item is inserted into the database. |
| **AC-23** | FR-05, D-07 | Calling `POST /api/items` with an `assetTag` that already exists in the database returns 409 `DUPLICATE_ASSET_TAG` and does not alter the catalog. |
| **AC-24** | FR-05 | Calling `POST /api/items` with missing `assetTag`, empty `name`, or fields exceeding maximum length returns 422 `VALIDATION_ERROR`. |
| **AC-25** | FR-18 | Running `npm run db:seed` creates exactly 2 borrowers, 2 custodians, 8 items (4 per custodian), and 1 item in `ON_LOAN` status with a corresponding active loan and fulfilled request. |
| **AC-26** | FR-18 | Running `npm run db:seed` twice consecutively succeeds without error and creates no duplicate records. |
| **AC-27** | NFR-03 | Items created in the database remain intact and retrievable via `GET /api/items` after the backend process is stopped and restarted. |
| **AC-28** | FR-04, FR-05, NFR-07 | In the UI, the `/items` page shows all catalog items with textual status badges; custodians can access the "Add Item" form, while borrowers cannot see or trigger the "Add Item" form. |

---

## 9. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-31** | AC-20 | Integration (API) | Seeded database with 8 items | Borrower calls `GET /api/items` | 200 OK; array of 8 items; each has `assetTag`, `name`, `status`, `managedBy`; no holder/borrower field present |
| **TEST-32** | AC-20 | Integration (API) | Seeded database | Custodian calls `GET /api/items` | 200 OK; identical catalog array returned |
| **TEST-33** | AC-21 | Integration (API + DB) | Authenticated custodian 1 | POST `/api/items` `{ assetTag: "EQ-100", name: "Logic Analyzer", description: "16 channels" }` | 201 Created; response has status `AVAILABLE`, `managedBy` equals custodian 1 ID; DB record exists |
| **TEST-34** | AC-21 | Integration (API) | Authenticated custodian | POST `/api/items` without `description` | 201 Created; `description` defaults to `""` |
| **TEST-35** | AC-22 | Integration (API + DB) | Authenticated borrower, item count recorded | Borrower calls POST `/api/items` with valid payload | 403 `FORBIDDEN_ROLE`; item count in database unchanged |
| **TEST-36** | AC-22 | Integration (API) | No token | POST `/api/items` with valid payload | 401 `UNAUTHENTICATED`; no item created |
| **TEST-37** | AC-23 | Integration (API + DB) | Item with `assetTag: "EQ-001"` already exists | Custodian calls POST `/api/items` with `assetTag: "EQ-001"` | 409 `DUPLICATE_ASSET_TAG`; catalog unchanged |
| **TEST-38** | AC-24 | Integration (API), boundary | Authenticated custodian | POST `/api/items` with missing `name`, empty `assetTag`, or `assetTag` of 31 chars | 422 `VALIDATION_ERROR` for each case |
| **TEST-39** | AC-24 | Integration (API), boundary | Authenticated custodian | POST `/api/items` with `assetTag` of 30 chars and `name` of 100 chars | 201 Created (valid boundaries accepted) |
| **TEST-40** | AC-25 | Integration (DB) | Empty test database, `SEED_DEMO_PASSWORD` set | Run seed script | Users count = 4 (2 BORROWER, 2 CUSTODIAN); items count = 8; 7 AVAILABLE, 1 ON_LOAN; 1 ACTIVE loan |
| **TEST-41** | AC-26 | Integration (DB) | Seeded test database | Run seed script a second time | Command completes with exit code 0; user count remains 4; item count remains 8; active loan count remains 1 |
| **TEST-42** | AC-25, AC-26 | Unit / Script | Seed module | Invoke seed function programmatically twice | Resolves without throwing unique constraint errors |
| **TEST-43** | AC-27 | Integration (System) | Item created in test DB | Kill and restart API server process, then call `GET /api/items` | 200 OK; previously created item is present with identical fields |
| **TEST-44** | AC-27 | Integration (DB) | Item inserted | Close Prisma client, reopen new connection to PostgreSQL | Record exists with identical attributes |
| **TEST-45** | AC-28 | E2E (Playwright) | Seeded database | Log in as custodian, add item "EQ-999", verify it appears in list; log out and log in as borrower, verify "Add item" is absent | Custodian can add item and see it; borrower sees catalog with status badges, but no "Add item" button |

Every AC is covered by at least one test.  
Negative test cases: TEST-35, TEST-36, TEST-37, TEST-38.  
Boundary test cases: TEST-38, TEST-39.  
Idempotency and persistence test cases: TEST-41, TEST-42, TEST-43, TEST-44.

---

## 10. Definition of Done for F-03

- [ ] All behaviors of sections 2 to 7 implemented.
- [ ] TEST-31 to TEST-45 written before implementation, observed failing (red), then passing (green). Real counts reported.
- [ ] Zod schema validates `POST /api/items` and returns uniform 422 error format.
- [ ] Seed script (`prisma/seed.ts`) is idempotent and passes single and consecutive execution tests.
- [ ] `asset_tag` unique constraint enforced at both schema and migration levels, mapped to 409 `DUPLICATE_ASSET_TAG`.
- [ ] No test weakened, disabled, or skipped.
- [ ] Code reviewed by teammate (Baptiste) with specific feedback, then merged into `sprint-1-staging`.
- [ ] No secrets in Git or `.env.example`.
- [ ] Any incomplete work or known limitations disclosed.

---

## 11. Assumptions and open points

- In Sprint 1, items can only have status `AVAILABLE` or `ON_LOAN`. `MAINTENANCE` and `RETIRED` statuses are deferred to Sprint 2 (D-16, FR-11, FR-20).
- Catalog pagination is not implemented in Sprint 1 (the seed contains 8 items; small catalog assumption in SDS 10.2). It will be added in Sprint 3 with search and filtering (FR-15, NFR-09).
- Asset tag format allows alphanumeric characters, underscores, and hyphens up to 30 characters.

---

## 12. Version history

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-11-05 | Initial feature contract for F-03 before implementation | Léo (Student B) |
