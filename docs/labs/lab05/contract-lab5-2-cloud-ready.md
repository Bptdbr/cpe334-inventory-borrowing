# Feature Contract L5-02: Cloud-Ready Application

**Product:** Equipment Inventory and Borrowing System (Theme 2), CPE 334, Semester 1/2026  
**Related Issue:** #L5-2 (Cloud-Ready Application)  
**Feature:** Cloud Readiness & Single Container Unified Serving  
**Requirements:** R-01, R-02, R-03, P-01, P-02, P-04, P-07, NFR-04, NFR-05, NFR-10  
**Version:** 1.0 (written before implementation)  
**Last updated:** 2026-11-23  
**Authors:** DUBROEUCQ Baptiste (69540460002) and LEPOUTRE Léo (69540460045)  

---

## 1. Objective and scope

Feature L5-02 transforms the Sprint 1 application into a cloud-ready, 12-factor compliant workload suitable for single-container deployment on Google Cloud Run (and local execution via Docker Compose):
1. Exposes a distinct readiness probe `GET /api/ready` that verifies PostgreSQL database connectivity without leaking credentials or internal stack details.
2. Unifies frontend SPA static serving under Express in production (`NODE_ENV=production`), serving pre-built assets from `frontend/dist` with client-side routing fallback to `index.html`, while preserving API and health isolation.
3. Enforces strict zero-trust configuration via Zod: eliminates the public default value for `SEED_DEMO_PASSWORD` in production, forcing explicit secret injection and refusing insecure default values.

| In scope | Out of scope |
|---|---|
| Public `GET /api/ready` probe verifying DB liveness | Dockerfile packaging and compose setup (deferred to L5-3) |
| Express static file hosting of `frontend/dist` in production | GitHub Actions CI/CD workflows (deferred to L5-4 & L5-7) |
| SPA routing fallback to `index.html` for client paths | Cloud SQL provisioning and IAM setup (handled via Portal in L5-1) |
| Strict isolation of `/api/*` and `/health` from SPA fallback | Multi-tenant CORS domains outside configured origin |
| Fail-fast validation of `SEED_DEMO_PASSWORD` in production | Modifying Sprint 1 business domain logic or tables |

---

## 2. Architecture and Workflow

### 2.1 Readiness Probe (`GET /api/ready`)
- **Liveness (`GET /health`)**: Checks process responsiveness (stateless, immediate 200, no database dependency).
- **Readiness (`GET /api/ready`)**: Verifies that the container is ready to accept user requests by validating database connectivity via Prisma (`SELECT 1` or query check).
  - If database responds: returns `200 OK` with `{ "status": "ready" }`.
  - If database fails/unreachable: returns `503 Service Unavailable` with `{ "status": "unready" }`.

### 2.2 Unified Static Serving and Routing Priority
In production (`NODE_ENV === "production"`):
1. `GET /health` -> Liveness handler (public JSON).
2. `GET /api/ready` -> Readiness handler (public JSON).
3. `ALL /api/*` -> REST API routers (Zod validation, auth, business logic). Unmatched `/api/*` calls fall through to `notFoundHandler` returning 404 JSON `{ "error": { "code": "NOT_FOUND", ... } }`.
4. `GET <static-asset>` -> Served from static folder (`frontend/dist` or configured `CLIENT_DIST_PATH`).
5. `GET <client-route>` (e.g. `/items`, `/my`, `/manage/requests`) -> SPA fallback serving `index.html`.

---

## 3. Configuration & Security Constraints

1. **Environment Variables**:
   - `PORT`: Integer port number (default `3000` locally, overridden by Cloud Run `PORT` env var).
   - `NODE_ENV`: `"development" | "test" | "production"`.
   - `SEED_DEMO_PASSWORD`:
     - In `development` / `test`: defaults to `"demo_password_123"`.
     - In `production`: required string without default; `seed.ts` explicitly refuses `"demo_password_123"`.
   - `CLIENT_DIST_PATH`: Optional custom path to pre-built frontend distribution (defaults to `../frontend/dist`).

---

## 4. Acceptance Criteria (AC)

| AC | Requirement | Expected Observable Outcome |
|---|---|---|
| **AC-L5-01** | P-04, R-03 | `GET /api/ready` returns `200 OK` with `{ "status": "ready" }` when database connectivity is healthy. |
| **AC-L5-02** | P-04, NFR-05 | `GET /api/ready` returns `503 Service Unavailable` with `{ "status": "unready" }` when the database is unreachable, with no database connection strings or stack traces leaked. |
| **AC-L5-03** | P-01, R-01 | In `NODE_ENV=production`, root `GET /` and static assets return the pre-compiled frontend distribution files. |
| **AC-L5-04** | P-01, NFR-07 | In `NODE_ENV=production`, non-API GET paths (such as `/items` or `/login`) return `index.html` for client-side React Router navigation. |
| **AC-L5-05** | SDS 10.3 | In `NODE_ENV=production`, unmatched routes under `/api/*` return `404 Not Found` JSON `{ "error": { "code": "NOT_FOUND", ... } }` and are never hijacked by the SPA fallback. |
| **AC-L5-06** | P-02, P-07 | In `NODE_ENV=production`, missing `SEED_DEMO_PASSWORD` causes configuration validation to throw and abort startup. |
| **AC-L5-07** | P-07, R-02 | In `NODE_ENV=production`, attempting to run `seed.ts` with `SEED_DEMO_PASSWORD="demo_password_123"` throws an explicit security refusal error. |

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| **TEST-L5-01** | AC-L5-01 | Unit / API | Mocked Prisma returning healthy connection | `GET /api/ready` | `200 OK`, `{ status: "ready" }` |
| **TEST-L5-02** | AC-L5-02 | Unit / API | Mocked Prisma throwing DB connection error | `GET /api/ready` | `503 Service Unavailable`, `{ status: "unready" }`, no stack or credentials leaked |
| **TEST-L5-03** | AC-L5-03 | Unit / API | `NODE_ENV=production`, static client dist populated | `GET /` | `200 OK`, HTML content with index markers |
| **TEST-L5-04** | AC-L5-04 | Unit / API | `NODE_ENV=production`, client route `/items` requested | `GET /items` | `200 OK`, fallback to `index.html` |
| **TEST-L5-05** | AC-L5-05 | Unit / API | `NODE_ENV=production`, invalid API path `/api/nonexistent` | `GET /api/nonexistent` | `404 Not Found`, JSON error body `{ "error": { "code": "NOT_FOUND" } }` |
| **TEST-L5-06** | AC-L5-06 | Unit | `NODE_ENV=production`, unset `SEED_DEMO_PASSWORD` | Validate config schema | Throws validation error indicating required field |
| **TEST-L5-07** | AC-L5-07 | Unit | `NODE_ENV=production`, `SEED_DEMO_PASSWORD="demo_password_123"` | Run `seed()` verification | Throws security error refusing default demo password |

---

## 6. Definition of Done (DoD)

- [ ] All 7 tests written before implementation and verified in red state.
- [ ] Minimal implementation added to pass all 7 tests.
- [ ] Existing Sprint 1 test suite remains clean with no weakened or disabled tests.
- [ ] `.env.example` documents all runtime variables including `CLIENT_DIST_PATH` and production constraints.
- [ ] Git commit message adheres to project conventions: `[Lab5-2] feat: add /api/ready, static SPA serving, and production security config`.
