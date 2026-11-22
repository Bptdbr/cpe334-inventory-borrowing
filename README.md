# Equipment Inventory and Borrowing System

Full-stack web application for lending department equipment (catalog, borrower requests, custodian checkout). CPE 334 Software Engineering project, KMUTT, Semester 1/2026. Theme 2, Sprint 1 release `v1.0-sprint1`.

## Architecture

- **Backend:** Node.js, Express, TypeScript, Zod, Argon2, JSON Web Tokens
- **Database:** PostgreSQL 16 or later, Prisma ORM (raw SQL migration for the partial unique indexes)
- **Frontend:** React, TypeScript, Vite, plain CSS
- **Tests:** Vitest and Supertest (unit and API/database integration), Playwright (end-to-end)

Documents are in `docs/` (SRS, decisions, features, traceability, system SDS, sprint plan, feature contracts in `docs/sprints/sprint-1/`).

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`) and npm 10 or later
- PostgreSQL 16 or later, running locally (a role that can create databases)

## Setup

### 1. Install

```bash
git clone https://github.com/Bptdbr/cpe334-inventory-borrowing.git
cd cpe334-inventory-borrowing
npm install
```

`package.json` authorizes the install scripts of Prisma, argon2 and esbuild (`allowScripts`). If the Prisma client is reported as not initialized, run `npx prisma generate --schema backend/prisma/schema.prisma`.

### 2. Create the databases

Create two empty databases, for example with `psql`:

```bash
psql -U postgres -h localhost -c "CREATE ROLE inventory_app LOGIN PASSWORD '<choose-a-local-password>' CREATEDB;"
psql -U postgres -h localhost -c "CREATE DATABASE inventory_dev OWNER inventory_app;"
psql -U postgres -h localhost -c "CREATE DATABASE inventory_test OWNER inventory_app;"
```

### 3. Environment files (never committed)

```bash
cp .env.example .env
cp .env.example .env.test
```

Edit both files:

| Variable | `.env` (development) | `.env.test` (tests) |
|---|---|---|
| `NODE_ENV` | `development` | `test` |
| `DATABASE_URL` | `postgresql://inventory_app:<password>@localhost:5432/inventory_dev?schema=public` | same, database `inventory_test` |
| `JWT_SECRET` | a random value of at least 32 characters | any value of at least 32 characters |
| `JWT_EXPIRES_IN_MINUTES` | `60` | `60` |
| `SEED_DEMO_PASSWORD` | password of the demo accounts | the same value |
| `CORS_ORIGIN` | `http://localhost:5173` | `http://localhost:5173` |
| `VITE_API_URL` | `http://localhost:3000` | not needed |

Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
The automated tests refuse to run unless `.env.test` points to a database named `inventory_test`, so they can never touch the development data.


### 4. Migrate and seed

The Prisma CLI and the seed script do not read the root `.env`, so run them through `dotenv-cli` (verified in a fresh clone):

```bash
cd backend
npx dotenv-cli -e ../.env -- npx prisma migrate deploy
npx dotenv-cli -e ../.env -- npm run db:seed
cd ..
```

Seed content: 2 borrowers (`borrower1`, `borrower2`), 2 custodians (`custodian1`, `custodian2`), 8 items (4 per custodian), and one item (`EQ-001`) already on loan. Every demo account uses the value of `SEED_DEMO_PASSWORD`, shared privately and never written in the repository. The seed is repeatable.


### 5. Run the application

```bash
npm run dev
```

API on http://localhost:3000 (`GET /health`), web application on http://localhost:5173.

## Tests

Prepare the test database once:

```bash
cd backend
npx dotenv-cli -e ../.env.test -- npx prisma migrate deploy
cd ..
```

| Command | What it runs |
|---|---|
| `npm test` | Unit and API/database integration tests (Vitest) on `inventory_test` |
| `npx playwright install chromium` | One-time download of the E2E browser |
| `npm run db:seed:e2e --workspace=backend` | Seed the demo accounts into `inventory_test` (before the E2E tests) |
| `cd frontend && npm run test:e2e` | End-to-end tests (Playwright), started on `inventory_test` |
| `npm run e2e:cleanup --workspace=backend` | Delete the `E2E-*` data created by the E2E tests |
| `cd frontend && npx tsc --noEmit` | Type check of the frontend |

Notes:
- Stop any backend already running on port 3000 before the E2E tests: Playwright refuses to reuse it, because it could be connected to the development database.
- Test files run one after the other because they share one database.

## Roles (Sprint 1)

| Role | Can do |
|---|---|
| Borrower | View the catalog, request an available item, view own requests and loans |
| Custodian | View the catalog, add items, view requests and active loans of managed items, check out a pending request |

Authorization is enforced by the API (401, 403, 404, 409, 422 as defined in `docs/system-sds.md`).

## Known limitations of Sprint 1

- Return, due dates, overdue status, cancellation, approval, item edit, search and reports are planned for Sprints 2 and 3.
- No self-registration or password recovery (seeded accounts only).
- The token is kept in `sessionStorage` (readable by scripts), no rate limiting.
- No Docker, CI/CD or cloud deployment yet (Lab 5).
- The Add item form and the loading and empty states have no end-to-end test.
- `npm run db:migrate`, `npm run db:seed` and `npm run db:reset` from the repository root do not load the root `.env`; use the `dotenv-cli` commands above. To fix in Sprint 2.