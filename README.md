# Equipment Inventory and Borrowing System

Full-stack web application for lending department equipment (inventory catalog, borrower requests, and custodian checkout). CPE 334 Software Engineering project, KMUTT, Semester 1/2026.

## Architecture

- **Backend:** Node.js, Express, TypeScript, Zod, Argon2, JSON Web Tokens
- **Database:** PostgreSQL 16, Prisma ORM (with raw SQL migrations for partial indexes)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS / clean CSS
- **Testing:** Vitest, Supertest (API/integration), Playwright (E2E)

## Prerequisites

- Node.js (LTS version, >= 20.x or 24.x)
- npm (>= 10.x)
- PostgreSQL 16 (running locally or in Docker)

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Bptdbr/cpe334-inventory-borrowing.git
cd cpe334-inventory-borrowing
npm install
```

### 2. Environment Configuration

Copy the example environment file and adjust the database credentials if necessary:

```bash
cp .env.example .env
```

Environment variables:
- `PORT`: Port for the API server (default: 3000)
- `NODE_ENV`: Application environment (`development`, `test`, `production`)
- `DATABASE_URL`: PostgreSQL connection string (must be kept secret, never committed)
- `JWT_SECRET`: Signing secret for JWT tokens (at least 32 characters)
- `JWT_EXPIRES_IN_MINUTES`: Token validity lifetime (default: 60)
- `SEED_DEMO_PASSWORD`: Password for seeded demo accounts
- `CORS_ORIGIN`: Allowed origins for frontend CORS
- `VITE_API_URL`: Base URL of the API for frontend requests

### 3. Database Migration and Seed

```bash
# Apply migrations
npm run db:migrate

# Seed demo data (2 borrowers, 2 custodians, 8 items, 1 on-loan item)
npm run db:seed

# Reset and re-seed the development database from scratch
npm run db:reset
```

### 4. Running the Application

```bash
# Start backend and frontend concurrently in development mode
npm run dev

# Or start individually:
npm run dev:backend
npm run dev:frontend
```

### 5. Running Tests

```bash
# Run unit and integration tests (backend)
npm test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests (Playwright)
npm run test:e2e
```

## Health Check Endpoint

- `GET /health` : Public endpoint returning `{ "status": "ok", "timestamp": "<ISO-8601>" }`. Contains no sensitive information.
