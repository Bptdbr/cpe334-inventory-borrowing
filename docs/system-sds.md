# System-Level Software Design Specification (SDS)

**Product:** Equipment Inventory and Borrowing System (Theme 2)
**Course:** CPE 334, Semester 1/2026
**Team:** DUBROEUCQ Baptiste [69540460002] and LEPOUTRE Léo [69540460045]
**Repository:** https://github.com/Bptdbr/cpe334-inventory-borrowing
**Related Issues:** #4 (sections 1 to 7), #5 (sections 8 to 12)
**Version:** 1.0 (complete system SDS)
**Last updated:** 2026-11-05

---

## 1. Introduction

### 1.1 Purpose

This document defines the shared technical decisions that apply across the whole application: architecture, technology stack, major components, data model and database setup. Feature-level designs (detailed endpoints, screens, test cases) are written later in the feature engineering contracts under `docs/sprints/`.

### 1.2 Inputs

- `docs/srs.md` version 1.1 (requirements FR-01 to FR-21, BR-01 to BR-13, NFR-01 to NFR-11).
- `docs/decisions.md` version 1.1 (decisions D-01 to D-18; D-14 to D-18 are listed in section 1.3).

### 1.3 Design decisions taken for this document

These decisions are also recorded in `docs/decisions.md`. D-17 and D-18 are marked `To confirm` there until the review of this document.

| ID | Decision | Rationale |
|---|---|---|
| D-14 | Authentication uses a **signed token** (JWT) sent in the `Authorization: Bearer` header. Token lifetime: 60 minutes (NFR-06). | Stateless API, easy to test, suitable for containers. Resolves Q-02. |
| D-15 | **Approval of requests is introduced in Sprint 2.** Sprint 1 has no approval step. | The product baseline includes approval; Sprint 1 stays minimal. |
| D-16 | The `MAINTENANCE` item status (Sprint 2) and item categories (Sprint 3) are part of the product. | They remain in scope of the full product. |
| D-17 | Stack: TypeScript, Node.js, Express, React with Vite, PostgreSQL, Prisma. | Same family of tools as in Labs 1 to 4, one language across the stack. |
| D-18 | Logout is implemented by **revoking the token's identifier (`jti`)** in a `revoked_tokens` table until its natural expiry. | A signed token cannot be invalidated otherwise, and FR-02 requires logout to invalidate it. |
| D-19 | Passwords hashed using **argon2id** (`argon2` package). | Salt embedded in the hash string, current recommended standard (NFR-02). |
| D-20 | JWT token carries only identity claims (`sub`, `jti`, `iat`, `exp`), no role; role loaded from DB per request. | Eliminates stale roles and prevents privilege tampering. |
| D-21 | The SPA stores the token in `sessionStorage`. | Survives page refresh, ends when tab closes, deleted on logout or 401. |

### 1.4 Scope of this document

| In this document | Elsewhere |
|---|---|
| Architecture, stack, structure, data model, enforcement of rules, database setup and seed | Role/permission matrix, authentication lifecycle, API and UI conventions, configuration, deployment plan: sections 8 to 12 (Issue #5) |
| | Detailed endpoints, screens and test cases: feature contracts (Issues #6 to #8) |

---

## 2. Architecture

### 2.1 Architectural style

A **modular monolith** with three logical layers: a single-page web application, a REST API with a service layer, and a relational database. The three layers do not require three servers: the API and the database are two processes (or containers), and the frontend is static files served separately or by the API.

### 2.2 Components and responsibilities

| Component | Responsibility | Does **not** do |
|---|---|---|
| **React SPA** (frontend) | Screens, navigation by role, client-side input hints, display of server errors, storing the token for the session | Enforce permissions or business rules (a hidden button is not authorization) |
| **API routes** | HTTP mapping, input validation (schemas), calling services, mapping errors to HTTP codes | Business rules |
| **Auth middleware** | Verify the token signature, expiry and revocation; attach the current user to the request | Decide domain access |
| **Role middleware** | Reject operations the user's role is not allowed to perform (403) | Check ownership of a specific record |
| **Services** (business layer) | Business rules, ownership and scope checks, transactions, state transitions | HTTP concerns |
| **Prisma data access** | Queries and transactions against PostgreSQL | Business decisions |
| **PostgreSQL** | Durable storage, referential integrity, last-line constraints (unique indexes, foreign keys, enums) | Role logic |

### 2.3 Component diagram

```mermaid
flowchart LR
  U[Browser<br/>React SPA] -- "HTTPS, JSON<br/>Authorization: Bearer token" --> R

  subgraph API[Node.js API - Express]
    R[Routes and<br/>input validation] --> A[Auth middleware<br/>token check]
    A --> RM[Role middleware<br/>403 by role]
    RM --> S[Services<br/>business rules,<br/>ownership, transactions]
    S --> P[Prisma<br/>data access]
  end

  P --> DB[(PostgreSQL)]
```

### 2.4 Backend modules

| Module | Sprint | Content |
|---|---|---|
| `auth` | 1 | Login, logout, current user, token creation and verification |
| `catalog` | 1 | List items, create item (edit, retire, search in later sprints) |
| `requests` | 1 | Create request, list own requests, list requests of managed items (cancel, approve, reject in Sprint 2) |
| `loans` | 1 | Checkout, list loans (return, due dates, overdue in Sprint 2) |
| `reports` | 3 | Inventory summary, overdue list |

Each module contains its routes, its service and its input schemas. Modules communicate through service functions, never through each other's database queries.

### 2.5 Where each category of rule is enforced

| Category | Enforced in | Why there |
|---|---|---|
| Authentication (valid token) | Auth middleware | Single entry point for all protected routes |
| Role permission (is this role allowed?) | Role middleware, declared per route | Visible and testable per endpoint |
| Ownership and scope (is this record mine or in my scope?) | Services, through the query filter | The decision depends on the record |
| State transitions and business rules | Services, inside a transaction | Rules must hold regardless of which client calls the API |
| Uniqueness and integrity (one active loan per item, etc.) | **Database constraints** | Last line of defense under concurrent requests |
| Input shape and types | Route validation (schemas) | Reject malformed input before any logic |

---

## 3. Technology stack

| Layer | Technology | Purpose | Alternative not chosen |
|---|---|---|---|
| Language | TypeScript (strict mode) | One typed language for frontend and backend | Plain JavaScript |
| Runtime | Node.js, current LTS version, pinned in `.nvmrc` and `engines` | Run the API | Other runtimes |
| API framework | Express | HTTP routing and middleware | Fastify, NestJS |
| Validation | Zod | Request schemas, typed inputs | Manual validation |
| ORM and migrations | Prisma and Prisma Migrate | Typed data access, versioned migrations | Raw SQL, TypeORM |
| Database | PostgreSQL 16 | Durable relational storage, partial unique indexes, row locking | MySQL (no partial indexes), SQLite (file lost on redeployment without a volume) |
| Authentication | Signed JWT (D-14) with revocation list (D-18); library and password-hashing algorithm are specified in section 9 | Stateless session | Server-side sessions |
| Frontend | React with Vite and React Router | Single-page application | Server-rendered pages |
| Unit and integration tests | Vitest, with Supertest for HTTP-level API tests | Rules, persistence, permissions | Jest |
| End-to-end tests | Playwright | Critical user journeys through the UI | Cypress |
| Package manager | npm, with a committed lock file | Reproducible installs | pnpm, yarn |

Exact dependency versions are fixed by the lock files and are not repeated in this document.

---

## 4. Repository structure

```
cpe334-inventory-borrowing/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/            # versioned SQL, including raw-SQL constraints
│   │   └── seed.ts                # demo data
│   ├── src/
│   │   ├── app.ts                 # Express app (importable by tests)
│   │   ├── server.ts              # process entry point
│   │   ├── config.ts              # reads environment variables
│   │   ├── middleware/            # authenticate, requireRole, errorHandler
│   │   ├── lib/                   # prisma client, error types, clock
│   │   └── modules/
│   │       ├── auth/
│   │       ├── catalog/
│   │       ├── requests/
│   │       └── loans/
│   └── tests/
│       ├── unit/
│       └── integration/
├── frontend/
│   ├── src/                       # pages, components, api client, auth context
│   └── e2e/                       # Playwright tests
├── docs/                          # srs, decisions, features, traceability,
│   └── sprints/                   # system-sds, sprint plan and contracts
├── .env.example
├── .gitignore
└── README.md
```

The Express `app` is exported separately from the code that starts the server, so integration tests can call the API without opening a network port.

---

## 5. Data model

### 5.1 Entities and relationships

```mermaid
erDiagram
  USER ||--o{ ITEM : "manages (managed_by)"
  USER ||--o{ LOAN_REQUEST : "submits (borrower_id)"
  ITEM ||--o{ LOAN_REQUEST : "is requested in"
  LOAN_REQUEST ||--o| LOAN : "is fulfilled by"
  ITEM ||--o{ LOAN : "is lent in"
  USER ||--o{ LOAN : "borrows (borrower_id)"
  USER ||--o{ LOAN : "checks out (custodian_id)"

  USER {
    uuid id PK
    string username UK
    string password_hash
    string display_name
    enum role
    timestamptz created_at
  }
  ITEM {
    uuid id PK
    string asset_tag UK
    string name
    text description
    enum status
    uuid managed_by FK
    timestamptz created_at
  }
  LOAN_REQUEST {
    uuid id PK
    uuid item_id FK
    uuid borrower_id FK
    enum status
    timestamptz created_at
    timestamptz fulfilled_at
  }
  LOAN {
    uuid id PK
    uuid item_id FK
    uuid borrower_id FK
    uuid request_id FK
    uuid custodian_id FK
    enum status
    timestamptz checked_out_at
  }
  REVOKED_TOKEN {
    string jti PK
    timestamptz expires_at
    timestamptz revoked_at
  }
```

### 5.2 Tables (Sprint 1)

All identifiers are UUIDs. All timestamps are `timestamptz` and are stored in UTC.

**`users`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| username | varchar(50) | NOT NULL, UNIQUE |
| password_hash | varchar | NOT NULL (hash only, never the password) |
| display_name | varchar(100) | NOT NULL |
| role | enum `Role` (`BORROWER`, `CUSTODIAN`) | NOT NULL |
| created_at | timestamptz | NOT NULL, default now |

**`items`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| asset_tag | varchar(30) | NOT NULL, UNIQUE |
| name | varchar(100) | NOT NULL |
| description | text | NOT NULL, default empty string |
| status | enum `ItemStatus` (`AVAILABLE`, `ON_LOAN`) | NOT NULL, default `AVAILABLE` |
| managed_by | uuid | NOT NULL, FK → `users.id`, ON DELETE RESTRICT |
| created_at | timestamptz | NOT NULL, default now |

**`loan_requests`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | NOT NULL, FK → `items.id`, ON DELETE RESTRICT |
| borrower_id | uuid | NOT NULL, FK → `users.id`, ON DELETE RESTRICT |
| status | enum `RequestStatus` (`PENDING`, `FULFILLED`) | NOT NULL, default `PENDING` |
| created_at | timestamptz | NOT NULL, default now |
| fulfilled_at | timestamptz | NULL until fulfilled |

**`loans`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | NOT NULL, FK → `items.id`, ON DELETE RESTRICT |
| borrower_id | uuid | NOT NULL, FK → `users.id`, ON DELETE RESTRICT |
| request_id | uuid | NOT NULL, UNIQUE, FK → `loan_requests.id` (one loan per request) |
| custodian_id | uuid | NOT NULL, FK → `users.id`, ON DELETE RESTRICT |
| status | enum `LoanStatus` (`ACTIVE`) | NOT NULL, default `ACTIVE` |
| checked_out_at | timestamptz | NOT NULL, default now |

**`revoked_tokens`** (D-18)

| Column | Type | Constraints |
|---|---|---|
| jti | varchar | PK (the token's unique identifier) |
| expires_at | timestamptz | NOT NULL, indexed (expired rows can be deleted) |
| revoked_at | timestamptz | NOT NULL, default now |

### 5.3 Constraints that protect the business rules

| Constraint | Definition | Protects |
|---|---|---|
| One active loan per item | **Partial unique index** on `loans(item_id)` where `status = 'ACTIVE'` | BR-01, BR-05 |
| One pending request per borrower and item | **Partial unique index** on `loan_requests(item_id, borrower_id)` where `status = 'PENDING'` | BR-06 |
| One loan per request | UNIQUE on `loans(request_id)` | BR-07 |
| Unique login and asset tag | UNIQUE on `users(username)` and `items(asset_tag)` | Identification |
| Valid statuses and roles | PostgreSQL enum types | Invalid states cannot be stored |
| Referential integrity | Foreign keys with ON DELETE RESTRICT | No orphan records |

**Prisma limitation.** Prisma's schema language cannot express partial unique indexes. They are created by hand-written SQL inside a migration (created with `prisma migrate dev --create-only`, then the SQL is edited). Consequences for the team:

- Use `prisma migrate` only. Do **not** use `prisma db push`, which compares the database to `schema.prisma` and may drop indexes it does not know.
- The raw SQL migration is committed and reviewed like any other code.
- A test verifies that the partial indexes exist and reject a second active loan inserted directly in the database.

### 5.4 Ownership and visibility at data level

| Link | Meaning | Used for |
|---|---|---|
| `items.managed_by` → custodian | The managing custodian of an item | BR-03, BR-08: scope of a custodian |
| `loan_requests.borrower_id` | Owner of a request | BR-04: borrower sees only their own |
| `loans.borrower_id` | Owner of a loan | BR-04 |
| `loans.custodian_id` | Custodian who performed the checkout (audit) | History |

Services never fetch a record by id alone. Every query includes the scope of the current user:

- Borrower: `where borrower_id = currentUser.id`.
- Custodian: `where item.managed_by = currentUser.id`.

A record outside the scope is reported as **404** (D-07), so a user cannot learn whether another user's record exists. A malformed identifier is rejected with 422.

The rule that `items.managed_by` must reference a user with role `CUSTODIAN` cannot be expressed as a simple foreign key. It is enforced in the catalog service when an item is created, and by the seed script.

### 5.5 Planned evolution (Sprints 2 and 3)

The model grows by additive migrations; no Sprint 1 table is redesigned.

| Sprint | Change | Requirement |
|---|---|---|
| 2 | `items.status` gains `MAINTENANCE` and `RETIRED` | FR-11, D-16 |
| 2 | `loan_requests.status` gains `APPROVED`, `REJECTED`, `CANCELLED`. Checkout then starts from an `APPROVED` request instead of a `PENDING` one | D-15, FR-12 |
| 2 | `loans` gains `due_at` and `returned_at`; `loans.status` gains `RETURNED` and `OVERDUE` (or overdue is derived from `due_at`) | FR-10, FR-13, FR-14 |
| 3 | `items` gains `category` | D-16, FR-15 |
| 3 | Indexes for search and reporting queries | FR-15, FR-16, NFR-09 |

The Sprint 2 approval step changes the precondition of the checkout rule (BR-07). This is handled as a visible contract revision in Sprint 2, not as a silent rewrite.

---

## 6. Business-rule enforcement map

Test IDs are assigned in the feature contracts (Issues #6 to #8). The test level is fixed here.

| Rule | Application layer | Database safeguard | Test level |
|---|---|---|---|
| BR-01 One active loan per item | Checkout service | Partial unique index on active loans | Integration (API + database) |
| BR-02 Only an `AVAILABLE` item can be requested or checked out | Request and checkout services | (none) | Integration |
| BR-03 Only the managing custodian can check out and see managed requests and loans | Role middleware and service scope filter | (none) | Integration (role and ownership) |
| BR-04 A borrower only sees and acts on their own records | Service scope filter (404 otherwise) | (none) | Integration |
| BR-05 Concurrent checkouts produce exactly one active loan | Conditional update inside a transaction | Partial unique index on active loans | Concurrency integration test |
| BR-06 No second pending request for the same item by the same borrower | Request service pre-check | Partial unique index on pending requests | Integration |
| BR-07 A request can be checked out only once, from `PENDING` | Conditional update of the request status | UNIQUE on `loans(request_id)` | Integration |
| BR-08 A custodian only adds items they manage | Catalog service sets `managed_by` from the token | Foreign key | Integration |
| BR-09 to BR-12 | Designed in Sprint 2 contracts | | |

### 6.1 Checkout transaction (F-05)

The checkout is the central transition of the product. It runs in a single database transaction and relies on **conditional updates**: the status change itself is the check, so two concurrent requests cannot both pass it.

```mermaid
sequenceDiagram
  actor C as Custodian
  participant API as API (middleware + service)
  participant DB as PostgreSQL

  C->>API: POST checkout for a request
  API->>API: Token valid? Role is CUSTODIAN? (401 / 403)
  API->>DB: BEGIN
  API->>DB: Load request and item in the custodian's scope
  alt not found or not managed by this custodian
    API-->>C: 404
  end
  API->>DB: UPDATE request SET FULFILLED WHERE id AND status = PENDING
  alt 0 rows updated
    API->>DB: ROLLBACK
    API-->>C: 409 request not pending
  end
  API->>DB: UPDATE item SET ON_LOAN WHERE id AND status = AVAILABLE
  alt 0 rows updated
    API->>DB: ROLLBACK
    API-->>C: 409 item unavailable
  end
  API->>DB: INSERT loan (ACTIVE)
  alt unique index violated
    API->>DB: ROLLBACK
    API-->>C: 409 active loan already exists
  end
  API->>DB: COMMIT
  API-->>C: 201 with the loan
```

Why this is concurrency-safe: when two checkouts target the same item, the second conditional update waits for the first transaction's row lock, then finds the status already `ON_LOAN`, updates zero rows, and rolls back with 409. If both somehow reached the insert, the partial unique index rejects the second loan. The API maps a unique-violation error from Prisma (code `P2002`) to 409.

*Other pending requests:* Under assumption A-08 (Q-03), if other borrowers submitted pending requests for the same item, those requests remain in `PENDING` status. They cannot be fulfilled while the item is `ON_LOAN`.

### 6.2 Request creation (F-04)

The request service checks that the item exists, is `AVAILABLE` (409 otherwise), then inserts a `PENDING` request. The partial unique index rejects a second pending request from the same borrower for the same item (409).

---

## 7. Database setup, migrations and seed

### 7.1 Environments

| Database | Purpose |
|---|---|
| `inventory_dev` | Local development and demonstration |
| `inventory_test` | Automated tests, emptied and re-seeded before each integration test run |

PostgreSQL runs locally or in a container started for development. The connection is given only through the `DATABASE_URL` environment variable (documented in `.env.example`).

### 7.2 Commands (documented in the README)

| Command | Effect |
|---|---|
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy` in non-development environments) |
| `npm run db:seed` | Insert demo data (idempotent) |
| `npm run db:reset` | Drop, recreate, migrate and seed the development database |
| `npm test` | Run unit and integration tests against `inventory_test` |

### 7.3 Seed content (synthetic data only)

| Data | Content |
|---|---|
| Users | 2 borrowers and 2 custodians with synthetic names. All share one demo password read from the `SEED_DEMO_PASSWORD` environment variable and are stored hashed |
| Items | 8 items with unique asset tags, split between the two custodians (4 each) |
| State | 1 item already `ON_LOAN`, with a `FULFILLED` request and an `ACTIVE` loan, so a rejection can be demonstrated without preparation |

Seed properties:

- **Repeatable:** items and users are upserted by `asset_tag` and `username`; running the seed twice creates no duplicates.
- **No secrets in Git:** `.env.example` contains only a dummy value; the real demo password is shared privately.
- **Reproducible demo:** `npm run db:reset` returns the database to the same known state.

### 7.4 Persistence

All domain data lives in PostgreSQL. The API keeps no domain state in memory, so data survives an API restart (NFR-03), and the same design works when PostgreSQL uses a persistent volume or a managed instance in Lab 5.

---

## 8. Role and permission matrix

Authorization is enforced by the backend on every request. Hiding a button in the UI is never an authorization mechanism. The identity and role of the caller come from the authenticated token and the database (section 9), never from a client-supplied user id or role.

### 8.1 Response convention (D-07)

| Code | Meaning | Example |
|---|---|---|
| 401 | Not authenticated (missing, invalid, expired or revoked token) | Anonymous call to `GET /api/items` |
| 403 | Authenticated, but the role is not allowed for the operation | Borrower calls checkout |
| 404 | Role allowed, but the record does not exist or is outside the caller's scope | Borrower reads another borrower's request |
| 409 | Conflict with the current state | Request for an item that is `ON_LOAN` |
| 422 | Invalid input | Missing `itemId`, malformed identifier |

### 8.2 Permission matrix (Sprint 1)

| Operation | Endpoint | Anonymous | Borrower | Custodian | Record scope |
|---|---|---|---|---|---|
| Log in | `POST /api/auth/login` | Allowed | n/a | n/a | n/a |
| Log out | `POST /api/auth/logout` | 401 | Allowed | Allowed | Own token |
| Current user | `GET /api/auth/me` | 401 | Allowed | Allowed | Own identity |
| Health check | `GET /health` | Allowed | Allowed | Allowed | No private data |
| List catalog | `GET /api/items` | 401 | Allowed | Allowed | All items with status; holder identity never exposed (D-08) |
| Add item | `POST /api/items` | 401 | 403 | Allowed | New item gets `managed_by` = caller (BR-08) |
| Request an item | `POST /api/requests` | 401 | Allowed | 403 | Borrower is the caller; item must be `AVAILABLE` (409 otherwise) |
| List own requests | `GET /api/requests/mine` | 401 | Allowed | 403 | Own requests only (404 on another's record) |
| List managed requests | `GET /api/requests` | 401 | 403 | Allowed | Requests of items where `managed_by` = caller |
| Check out a request | `POST /api/requests/{id}/checkout` | 401 | 403 | Allowed | Request concerns a managed item (404 otherwise) and is `PENDING` (409 otherwise) |
| List own loans | `GET /api/loans/mine` | 401 | Allowed | 403 | Own loans only |
| List managed loans | `GET /api/loans` | 401 | 403 | Allowed | Loans of items where `managed_by` = caller |

### 8.3 Ownership rules

| Rule | Requirement |
|---|---|
| A borrower sees and acts only on their own requests and loans; another borrower's record returns 404 with no private data. | BR-04 |
| A custodian sees and acts only on requests and loans of items they manage; another custodian's record returns 404. | BR-03 |
| Only the managing custodian can check out a request. | BR-03 |
| A custodian cannot add or modify items on behalf of another custodian. | BR-08 |
| No endpoint accepts a user id, role or `managed_by` value from the client. | NFR-01 |

### 8.4 Where each check happens

| Check | Layer (section 2.5) |
|---|---|
| Valid token | Auth middleware |
| Role (401/403) | Role middleware, declared per route |
| Ownership and scope (404) | Service, through the query filter |

### 8.5 Sprint 2 and 3 extensions

The matrix grows with the sprints. Sprint 2 adds return (FR-10), cancellation (FR-12), approve/reject (FR-19, custodian only, managed items) and maintenance/retire/edit (FR-11, FR-20, managing custodian only). From Sprint 2, checkout starts from an `APPROVED` request (BR-13; see section 5.5). Sprint 3 adds search (FR-15), categories (FR-21) and reports (FR-16). Each extension is specified in its feature contract and added here as a visible revision.

## 9. Authentication and token lifecycle

This section implements D-14 (signed token, 60 minutes) and D-18 (logout by revocation of the token identifier). It covers FR-01, FR-02, FR-03, NFR-02 and NFR-06.

### 9.1 Credential handling

| Aspect | Design | Requirement |
|---|---|---|
| Storage | Only a salted hash is stored in `users.password_hash`. The plain password is never stored or logged. | NFR-02 |
| Algorithm | **argon2id** through the `argon2` package, default parameters. The salt is generated by the library and embedded in the hash string (D-19). | NFR-02 |
| Seed accounts | The seed hashes `SEED_DEMO_PASSWORD` with the same function. No password appears in Git. | NFR-04 |
| Verification | `argon2.verify(hash, password)`. | FR-01 |

### 9.2 Token format

A signed JWT (HS256) sent in the `Authorization: Bearer <token>` header. The signing secret comes from the `JWT_SECRET` environment variable and is never committed.

| Claim | Content |
|---|---|
| `sub` | User id (uuid) |
| `jti` | Unique token identifier (random uuid), used for revocation |
| `iat` | Issued-at time |
| `exp` | Expiry time: `iat` + `JWT_EXPIRES_IN_MINUTES` (default 60, NFR-06) |

The token carries no role. On every request the auth middleware loads the user from the database by `sub`, so the role used for authorization is always the current one (D-20). A request body or header can never supply a user id or role.

### 9.3 Lifecycle

| Step | Behavior |
|---|---|
| Login | `POST /api/auth/login` with `{ username, password }`. On success: 200 with `{ token, expiresAt, user: { id, username, displayName, role } }`. No refresh token in Sprint 1. |
| Use | The SPA sends the token on every request. The auth middleware checks, in this order: header present, signature valid, `exp` not passed, `jti` not in `revoked_tokens`, user still exists. Any failure returns 401 with the generic error body. |
| Current user | `GET /api/auth/me` returns the identity and role of the authenticated user (FR-03). |
| Logout | `POST /api/auth/logout` inserts the token's `jti` with its `exp` into `revoked_tokens` and returns 204. The same token is rejected with 401 afterwards (FR-02). |
| Expiry | After 60 minutes the token is rejected with 401. The user must log in again. |
| Cleanup | Rows of `revoked_tokens` whose `expires_at` has passed are useless and can be deleted by a periodic cleanup (not required in Sprint 1). |

```mermaid
sequenceDiagram
  actor U as User (SPA)
  participant API as API
  participant DB as PostgreSQL

  U->>API: POST /api/auth/login {username, password}
  API->>DB: SELECT user by username
  API->>API: argon2.verify(hash, password)
  alt unknown user or wrong password
    API-->>U: 401 "Invalid username or password"
  end
  API-->>U: 200 {token (sub, jti, exp), user}
  U->>API: GET /api/items (Bearer token)
  API->>API: verify signature and exp
  API->>DB: jti revoked? user exists?
  API-->>U: 200
  U->>API: POST /api/auth/logout (Bearer token)
  API->>DB: INSERT revoked_tokens (jti, exp)
  API-->>U: 204
  U->>API: GET /api/auth/me (same token)
  API->>DB: jti revoked?
  API-->>U: 401
```

### 9.4 Invalid credentials

Unknown username and wrong password return the **same** 401 response with the same message, "Invalid username or password" (FR-01). For an unknown username the service still runs a verification against a fixed dummy hash, so response time does not reveal whether the account exists.

### 9.5 Client-side token storage

The SPA keeps the token in `sessionStorage`, so a page refresh keeps the session and closing the tab ends it (D-21). On logout, and on any 401 response, the SPA deletes the token and returns to the login screen. This storage is readable by scripts, which is an accepted limitation for a course project with synthetic data. It is listed in the limitations of the final report.

### 9.6 Failure behavior

| Situation | Response |
|---|---|
| Missing, malformed or badly signed token | 401 |
| Expired token | 401 |
| Revoked token (after logout) | 401 |
| Token of a deleted user | 401 |
| Validation error on the login body (missing field) | 422 |

Error bodies follow the uniform format of section 10 and never contain stack traces or internal details (NFR-05).

### 9.7 Verification

| Requirement | Verified by |
|---|---|
| FR-01 | Integration test: valid login, wrong password and unknown user return the identical 401 body |
| FR-02 | Integration test: token rejected with 401 after logout |
| FR-03 | Integration test: `/me` returns the caller's identity and role |
| NFR-02 | Test: stored value differs from the password and has the argon2id format |
| NFR-06 | Test with a short expiry in the test configuration: expired token returns 401 |

Test IDs are assigned in the contract of F-01 (Issue #6).

## 10. API conventions and error handling

This section applies to every endpoint. Detailed request and response shapes are fixed in the feature contracts (Issues #6 to #8).

### 10.1 Endpoint conventions

| Aspect | Convention |
|---|---|
| Base path | All application endpoints are under `/api`. `GET /health` is the only endpoint outside it. |
| Format | JSON only (`Content-Type: application/json`), UTF-8. |
| Resource names | Plural nouns in lowercase: `/api/items`, `/api/requests`, `/api/loans`. |
| Actions that are state transitions | A sub-resource verb on the record: `POST /api/requests/{id}/checkout`. |
| Views scoped to the caller | `/mine` suffix for the borrower's own records (`/api/requests/mine`, `/api/loans/mine`). |
| Identifiers | UUIDs. A malformed identifier returns 422. |
| Dates | ISO 8601 strings in UTC, for example `2026-11-04T11:30:00.000Z` (A-05). |
| Field names | camelCase in JSON (`itemId`, `assetTag`), snake_case in the database. |
| Caller identity | Always from the token. No request carries a user id, role or `managed_by` value. |

### 10.2 Success responses

| Case | Status | Body |
|---|---|---|
| Read | 200 | The resource or an array of resources |
| Creation | 201 | The created resource |
| Action without content (logout) | 204 | Empty |

Lists are returned as plain arrays in Sprint 1. Pagination is not required for the seeded catalog and is reconsidered with search in Sprint 3 (NFR-09).

### 10.3 Error format

Every error has the same body:

    { "error": { "code": "ITEM_UNAVAILABLE", "message": "This item is not available." } }

| Status | Codes (examples) | Used when |
|---|---|---|
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | Missing, invalid, expired or revoked token; wrong login |
| 403 | `FORBIDDEN_ROLE` | Role not allowed for the operation |
| 404 | `NOT_FOUND` | Record absent or outside the caller's scope |
| 409 | `ITEM_UNAVAILABLE`, `REQUEST_NOT_PENDING`, `DUPLICATE_PENDING_REQUEST`, `ACTIVE_LOAN_EXISTS`, `DUPLICATE_ASSET_TAG` | Conflict with the current state or duplicate asset tag |
| 422 | `VALIDATION_ERROR` | Invalid input; may include a `details` array of field messages |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

Rules:

- `code` is stable and machine-readable; `message` is plain language for the user.
- A 500 returns a generic message. Stack traces, SQL errors, file paths and library messages are logged on the server and never sent (NFR-05).
- A 401 or 404 body never contains private data (NFR-01, BR-04).
- Unknown routes return 404 with the same format.

### 10.4 Validation

| Aspect | Convention |
|---|---|
| Where | Route layer, with Zod schemas, before any service call. |
| Unknown fields | Ignored, never trusted; identity fields are never read from the body. |
| Order of checks | Authentication (401), role (403), input validation (422), scope (404), state (409). |

### 10.5 Mapping of database errors

| Database error | HTTP result |
|---|---|
| Unique violation (Prisma `P2002`) on active-loan, pending-request, or item asset_tag index | 409 with the matching code (`ACTIVE_LOAN_EXISTS`, `DUPLICATE_PENDING_REQUEST`, `DUPLICATE_ASSET_TAG`) |
| Zero rows updated by a conditional update | 409 |
| Any other database error | 500 `INTERNAL_ERROR`, details logged only |

### 10.6 Verification

| Requirement | Verified by |
|---|---|
| NFR-01 | API test over every protected endpoint without a token: 401 and no private data |
| NFR-05 | API test that triggers a server error and inspects the body |
| D-07 | Integration tests per code: 401, 403, 404, 409, 422 |

Test IDs are assigned in the feature contracts (Issues #6 to #8).

## 11. UI conventions

This section applies to every screen. It implements NFR-07 and the role-based navigation of the SPA. The UI never enforces authorization: it only reflects what the API allows, and every rule is enforced by the backend (section 8).

### 11.1 Screens and navigation (Sprint 1)

| Screen | Route | Borrower | Custodian | Feature |
|---|---|---|---|---|
| Login | `/login` | Public | Public | F-01 |
| Catalog | `/items` | Yes | Yes (plus "Add item") | F-03 |
| My requests and loans | `/my` | Yes | Hidden | F-04, F-06 |
| Requests to process | `/manage/requests` | Hidden | Yes | F-05, F-06 |
| Active loans | `/manage/loans` | Hidden | Yes | F-06 |

- The navigation bar shows only the entries of the current role, read from `GET /api/auth/me`. It also shows the user's display name and a **Log out** button.
- An unauthenticated visitor is redirected to `/login`. After login, the user lands on `/items`.
- Typing the URL of a hidden screen does not grant access: the API answers 403 and the screen shows the error state.

### 11.2 Shared behavior of every screen that loads data

| State | Behavior | Test |
|---|---|---|
| Loading | A visible loading indicator replaces the content. Action buttons are disabled while their request is pending (prevents double submit). | E2E |
| Empty | A message states that there is nothing to show and, where useful, what to do next (for example "No requests yet"). | E2E |
| Error | A message shows the reason returned by the server, in plain language, with a retry action for read errors. | E2E |
| Success | The result is displayed after the server confirms. The UI never assumes success before the response. | E2E |

### 11.3 Server errors shown to the user

| Status | Display |
|---|---|
| 401 | The token is deleted and the user is sent to `/login` with the message "Your session has expired, please log in again." |
| 403 | "You are not allowed to do this." |
| 404 | "This record was not found." |
| 409 | The `message` from the server (for example "This item is not available."). The screen refreshes its data. |
| 422 | Field-level messages from `details`, next to the fields. |
| 500 or network failure | A generic message, "Something went wrong, please try again." No technical detail is shown. |

### 11.4 Forms

| Rule | Detail |
|---|---|
| Client-side checks | Required fields and length hints only, to help the user. They are not trusted: the server always validates (section 10.4). |
| Login form | One generic message for invalid credentials, identical for an unknown user and a wrong password (FR-01). The password field is never prefilled or logged. |
| Add item form | Fields: asset tag, name, description. `managed_by` is never sent (BR-08). |
| Request action | Button "Request" on an `AVAILABLE` item. Disabled for `ON_LOAN` items, but the server still rejects the call (BR-02). |
| Checkout action | Button "Check out" on a `PENDING` request in the custodian's list. |

### 11.5 Accessibility and consistency

- Status values are shown as text, never by color alone.
- Every form control has a visible label.
- The same component displays loading, empty and error states on all screens.
- Contrast compliance (NFR-11) is verified in Sprint 3.

### 11.6 Verification

| Requirement | Verified by |
|---|---|
| NFR-07 | E2E test on selected screens: loading, empty and error states, and display of a server rejection reason |
| FR-02 | E2E: after logout the user is back on `/login` and a protected screen is not reachable |

Test IDs are assigned in the contracts of Issues #6 to #8 and in the E2E work of Issue #14.

## 12. Configuration and deployment plan

This section covers NFR-04 (externalized configuration, no committed secret) and NFR-10 (clean checkout, ready for Docker). The Docker packaging, CI/CD and GCP deployment are delivered in Lab 5; this section fixes the design they rely on.

### 12.1 Configuration principles

| Principle | Detail |
|---|---|
| Environment only | All configuration is read from environment variables in `backend/src/config.ts`. No value is hard-coded. |
| Fail fast | At startup the API validates the variables with a Zod schema. A missing or invalid required variable stops the process with a clear message that never prints secret values. |
| No secret in Git | `.env` is listed in `.gitignore`. `.env.example` is committed and contains only dummy values. |
| Same code everywhere | Local, test and deployed environments differ only by variable values. |

### 12.2 Environment variables

| Variable | Required | Example (dummy) | Purpose | Secret |
|---|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `development`, `test` or `production` | No |
| `PORT` | No (default 3000) | `3000` | API listening port | No |
| `DATABASE_URL` | Yes | `postgresql://user:password@localhost:5432/inventory_dev` | PostgreSQL connection (section 7.1) | Yes |
| `JWT_SECRET` | Yes | `change-me-use-a-long-random-value` | HS256 signing key (section 9.2); at least 32 characters | Yes |
| `JWT_EXPIRES_IN_MINUTES` | No (default 60) | `60` | Token lifetime (NFR-06); shortened in tests | No |
| `SEED_DEMO_PASSWORD` | Seed only | `change-me-demo` | Password given to the demo accounts by the seed (section 7.3) | Yes |
| `CORS_ORIGIN` | Yes in production | `http://localhost:5173` | Allowed browser origin of the SPA | No |
| `VITE_API_URL` | Frontend build | `http://localhost:3000` | API base URL compiled into the SPA | No |

The test environment uses `DATABASE_URL` pointing to `inventory_test` (section 7.1). Real values are never written in the PDF, the README or Git; demo credentials are shared through the private course handoff.

### 12.3 Local setup (summary, detailed in the README)

| Step | Command |
|---|---|
| 1. Install dependencies | `npm install` (backend and frontend) |
| 2. Configure | Copy `.env.example` to `.env` and set the values |
| 3. Start PostgreSQL | Local installation or a development container |
| 4. Create schema and demo data | `npm run db:migrate`, then `npm run db:seed` |
| 5. Run | Start the API and the SPA (commands in the README) |
| 6. Test | `npm test` (unit and integration), then the Playwright command for E2E |

### 12.4 Container-readiness design

| Requirement | Design choice |
|---|---|
| Stateless API | No domain state in process memory; sessions are tokens plus the `revoked_tokens` table (D-14, D-18). Several API instances can run behind a load balancer. |
| Durable data | All data lives in PostgreSQL, which needs a persistent volume or a managed instance (NFR-03). |
| Config by environment | Section 12.2; nothing is read from local files at runtime. |
| Logs | Written to standard output, one line per event, with no secret or password. |
| Health | `GET /health` returns 200 for the platform health check and does not expose private data. |
| Migrations | `prisma migrate deploy` is run as an explicit step before starting the new API version, never by `db push`. |
| Reproducible build | npm lock files committed; Node version pinned in `.nvmrc` and `engines`. |

### 12.5 Planned Docker packaging (Lab 5)

| Image | Content |
|---|---|
| `api` | Multi-stage build: install and compile TypeScript, then a slim runtime image with production dependencies, running as a non-root user. |
| `web` | Multi-stage build: compile the SPA with Vite, then serve the static files with a small web server. |
| Database | Official PostgreSQL 16 image for local compose; a managed instance in the cloud. |

A compose file starts the three components locally with variables from `.env`. The goal is a working container from a fresh clone with documented commands only.

### 12.6 Planned GCP deployment (Lab 5)

| Component | Planned GCP service | Notes |
|---|---|---|
| API container | Cloud Run | Stateless, scales to zero, configured by environment variables |
| Frontend | Cloud Run (static container) or Cloud Storage with a CDN | To be chosen in Lab 5 |
| Database | Cloud SQL for PostgreSQL | Automated backups, data survives restarts and redeployments |
| Secrets | Secret Manager | `DATABASE_URL`, `JWT_SECRET` injected as environment variables at deployment |
| Images | Artifact Registry | Built and pushed by the pipeline |
| Delivery | CI/CD from GitHub (for example GitHub Actions) | Build and tests on each PR; deploy accepted releases from `main`; failed required checks block the merge |

The GCP access method is provided with the Lab 5 instructions, so this plan is provisional and will be revised then. Any change is recorded as a new decision.

### 12.7 Release flow

`feature branch` → PR into `sprint-1-staging` (reviewed by the teammate) → integration and acceptance checks → reviewed release PR into `main` → tag `v1.0-sprint1` → (Lab 5) pipeline deploys from `main`.

### 12.8 Verification

| Requirement | Verified by |
|---|---|
| NFR-04 | Repository inspection (`.env` ignored, `.env.example` complete) and a clean-clone setup run from the README |
| NFR-10 | README run-through in Sprint 1; container build in Lab 5 |
| NFR-03 | Integration test: create data, restart the application, read the data |

---

## Change history

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1 | 03/11/2026 | Sections 1 to 7: architecture, stack, structure, data model, rule enforcement, database setup and seed | Léo |
| 0.2 | 04/11/2026 | sections 8 to 12 : permissions, authentication, API, UI, configuration | Baptiste |
