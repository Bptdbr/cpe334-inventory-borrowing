# Lab 5: Cloud Deployment and CI/CD Pipeline on GCP
## Equipment Inventory and Borrowing System (Theme 2)

**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents — Semester 1/2026  
**Students:**
- DUBROEUCQ Baptiste, ID 69540460002 (Bptdbr)
- LEPOUTRE Léo, ID 69540460045 (LeoMin13)

**Repository:** `https://github.com/Bptdbr/cpe334-inventory-borrowing`  
**Submission:** LEB2, one PDF per team (`lab5_sec<sec>_<group>.pdf`)  
**Target Release Tag:** `v1.1-lab5`  
**Public Service URL:** `[TO FILL FROM GCP CLOUD RUN]`  

---

## Navigation Table

| Part | Title | Points | Key Identifiers and Content |
|---|---|---|---|
| **Part 0** | Identification, Contributions & Evidence Index | - | Team info, repository link, release commit, contribution table, evidence index |
| **Part 1** | CI Pipeline & Branch Protection | 30 pts | `ci-docker.yml`, C-01 (passing PR), GitHub ruleset configuration, C-02 (failing PR blocked) |
| **Part 2** | Containerization & Clean Local Execution | 20 pts | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, C-03 (clean clone build and run), `.env.example` |
| **Part 3** | Cloud Deployment & Persistence on GCP | 35 pts | Public Cloud Run URL, C-04 (domain workflow: login, request, checkout, forbidden), C-05 (data persistence across restart and redeploy) |
| **Part 4** | CD Pipeline, Release Workflow & Auditability | 15 pts | `deploy.yml`, reviewed release PR `lab5-staging` -> `main`, C-06 (digest deployment, audit trail), release procedure |

---

## Part 0: Project Baseline and Evidence Index

### 0.1 Team and Project Identification

| Item | Value |
|---|---|
| **Project Theme** | Theme 2: Equipment Inventory and Borrowing System |
| **Repository (Public)** | `https://github.com/Bptdbr/cpe334-inventory-borrowing` |
| **Student 1** | DUBROEUCQ Baptiste (69540460002) — GitHub: `Bptdbr` |
| **Student 2** | LEPOUTRE Léo (69540460045) — GitHub: `LeoMin13` |
| **Release Tag** | `v1.1-lab5` |
| **Release Commit SHA** | `[TO FILL: 40-character commit SHA]` |
| **Public Service URL** | `[TO FILL: Cloud Run HTTPS URL]` |
| **GCP Shared Project** | `cpe-se-course-2026` |
| **GCP Region** | `asia-southeast1` |
| **GCP Team Prefix** | `s9bc98308` |
| **Cloud Run Service** | `s9bc98308` |
| **Cloud Run Migration Job** | `s9bc98308-migrate` |
| **Artifact Registry** | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9bc98308-registry/app` |

### 0.2 Contribution Table

| Task / Issue | Description | Author | Reviewer | PR / Evidence |
|---|---|---|---|---|
| **L5-1** | Course Portal Activation & GCP Cloud Provisioning | Léo | Baptiste | Portal screenshots, resources confirmed (`s9bc98308`) |
| **L5-2** | Cloud-Ready Application (GET /api/ready, static serving, config) | Léo | Baptiste | PR #37 (merged into `lab5-staging`) |
| **L5-3** | Docker Packaging & Docker Compose Setup | Léo | Baptiste | PR #39 (commit `ea12ace`, merged into `lab5-staging`) |
| **L5-4** | CI Pipeline with `test-and-docker` Job & Dependabot | Baptiste | Léo | PR `feat/lab5-ci` -> `lab5-staging` |
| **L5-5** | Initial Staging Deployment on Cloud Run | Léo | Baptiste | PR `feat/lab5-first-deploy` -> `lab5-staging` |
| **L5-6** | Branch Protection Ruleset & C-02 Rejection Demonstration | Baptiste | Léo | GitHub ruleset, PR on `test/lab5-failing-check` |
| **L5-7** | Continuous Deployment Pipeline (`deploy.yml` & Release Audit) | Baptiste | Léo | PR `feat/lab5-deploy-workflow` -> `lab5-staging` |
| **L5-8** | Database Persistence Verification across Redeploy | Léo | Baptiste | Evidence C-05 (Cloud SQL persistence) |
| **L5-9** | Deployment Documentation & Final Deliverable PDF | Léo & Baptiste | Both | `docs/labs/lab05/deployment.md` & PDF |

### 0.3 Master Evidence Index (Checks C-01 to C-06)

| Check ID | Requirement | Target / Description | Evidence Location in Report | Status |
|---|---|---|---|---|
| **C-01** | R-05, R-10 | PR triggers `test-and-docker` CI; all tests pass | Part 1, Figure 1.2 | To verify |
| **C-02** | R-06 | PR with failing test cannot be merged (merge blocked) | Part 1, Figure 1.4 | To verify |
| **C-03** | R-01, R-02 | Clean clone builds and runs with `.env.example` only | Part 2, Section 2.2 | **Verified** |
| **C-04** | R-03, R-11 | Public URL demonstrates login, domain action, and rejection | Part 3, Figures 3.1–3.4 | To verify |
| **C-05** | R-04 | Data persists across Cloud Run container restart and redeployment | Part 3, Figures 3.5–3.7 | To verify |
| **C-06** | R-07, R-08 | Reviewed release merges to main; deployed revision matches SHA | Part 4, Figures 4.1–4.3 | To verify |

---

## Part 1: CI Pipeline & Branch Protection (30 points)

### 1.1 CI Workflow Configuration (`ci-docker.yml`)
- **Workflow File:** `.github/workflows/ci-docker.yml`
- **Required Job Name:** `test-and-docker` (strictly preserved per R-06 for ruleset enforcement)
- **Triggers:**
  - `pull_request` targeting `main` and `lab5-staging`
  - `workflow_call` (for seamless reuse by `deploy.yml` in L5-7)
  - `workflow_dispatch` (for manual dispatch)
- **Permissions:** Principle of least privilege (`contents: read`).
- **Third-Party Actions:** Strictly pinned by full commit SHA:
  - `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` (# v4.2.2)
  - `actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a` (# v4.2.0)
- **Pipeline Stages:**
  1. Service Container: PostgreSQL 16 on port 5432 with throwaway credentials.
  2. Setup & Environment: Node.js 24 LTS, generation of ephemeral `.env.test`.
  3. Clean Install: `npm ci` at repository root (monorepo workspaces).
  4. Database Setup: `npx prisma generate` and `npx prisma migrate deploy`.
  5. Automated Testing: Full backend suite (`npm test`, Vitest unit & integration).
  6. Workspace Build: `npm run build` (backend `tsc` + frontend `vite build`).
  7. End-to-End Testing: `npx playwright install --with-deps chromium`, `db:seed:e2e`, `npm run test:e2e`, and `e2e:cleanup`.
  8. Container Packaging Verification (R-01): `docker build -t cpe334-inventory:ci .` ensuring clean packaging without secrets.
- **Dependency Automation:** `.github/dependabot.yml` configured to automatically monitor weekly updates for `github-actions` and `npm` ecosystems.

### 1.2 Check C-01: Passing CI Run on PR
*(To record: PR URL, CI Run URL, summary of passed test suites: 78 Vitest, 10 Playwright, Docker build OK).*

### 1.3 Check C-02: Branch Protection Ruleset & Merge Blocking (R-06)
- **GitHub Ruleset Configuration (`main`):**
  - Ruleset Name: `protect-main-release` (Enforcement: Active, Target: Default branch `main`).
  - Restrictions: Restrict deletions, block force pushes.
  - Pull Request Requirements: 1 required approving review from a teammate; stale reviews dismissed on new pushes.
  - Status Check Requirements: Strict required check **`test-and-docker`**; branch must be up to date before merging.
- **Merge Lock Demonstration:**
  - Branch: `test/lab5-failing-check` (Commit containing intentional test failure in `merge-lock-proof.test.ts`).
  - PR opened targeting `main`.
  - Result: CI workflow triggered, job `test-and-docker` failed.
  - Evidence: Merge button disabled by GitHub with message *"Required status check 'test-and-docker' failed. Merging is blocked."* (Figure 1.4).
  - PR closed unmerged and branch deleted; `main` remained completely untouched and protected.

---

## Part 2: Containerization & Clean Local Execution (20 points)

### 2.1 Multi-Stage Dockerfile and Compose Configuration
- `Dockerfile`: Multi-stage build for npm workspaces. Build stage compiles TypeScript and Vite frontend, generates Prisma client. Runtime stage is lightweight Debian Bookworm with OpenSSL, non-root user `node` (uid 1000), listening on `PORT=3000`.
- `.dockerignore`: Strictly excludes `.git`, `.env*` (except `.env.example`), `node_modules`, test coverage, and documentation from build context (build context reduced to 5.42 kB).
- `docker-compose.yml`: Coordinates PostgreSQL 16 (healthchecked), one-shot migration & seed container, and Express app container.

### 2.2 Check C-03: Clean Clone Verification
- **Tested Commit:** `ea12ace5e294e95dae4f31b58b1f353418a0ba86` (PR #39)
- **Reproduction Steps:**
  1. `git clone --branch feat/lab5-docker https://github.com/Bptdbr/cpe334-inventory-borrowing.git clean-clone`
  2. `cp .env.example .env` and configure `SEED_DEMO_PASSWORD` to local secret.
  3. `docker compose up --build`
- **Observed Results:**
  - Database became healthy on port 5432.
  - `migrate` service applied all migrations, ran seed, and exited with code 0.
  - `app` service started listening on port 3000 in production mode.
  - `curl http://localhost:3000/health` -> `200 OK`
  - `curl http://localhost:3000/api/ready` -> `200 OK`
  - `curl http://localhost:3000/` -> `200 OK` (SPA `index.html`)

### 2.3 Local Data Persistence (R-04)
- User `borrower1` logged in and created request for `EQ-004` (status `PENDING`).
- Executed `docker compose down`, followed by `docker compose up`.
- The request remained persisted with identical timestamp in named volume `pgdata`.

---

## Part 3: Cloud Deployment & Persistence on GCP (35 points)

*(To be filled during L5-5 and L5-8)*

---

## Part 4: CD Pipeline, Release Workflow & Auditability (15 points)

### 4.1 Continuous Deployment Pipeline (`deploy.yml`)
- **Workflow File:** `.github/workflows/deploy.yml`
- **Execution Triggers:**
  - `push` targeting `main` (triggered upon merging reviewed release PR).
  - `workflow_dispatch` with optional `image_tag` input (used for immediate manual deployment or rollback to a previous commit SHA).
- **Security & Keyless Authentication:**
  - Authenticates to GCP via Workload Identity Federation (WIF) with `WIF_PROVIDER` and `WIF_SERVICE_ACCOUNT` (no static service account JSON keys stored).
  - Concurrency group `production-deployment` (`cancel-in-progress: false`) prevents race conditions between simultaneous release runs.
- **Pipeline Stages:**
  1. **CI Pipeline Gate:** Reuses `.github/workflows/ci-docker.yml` via `workflow_call`. Enforces that PostgreSQL service tests, Prisma migrations, Vitest suite, Vite build, Playwright E2E tests, and Docker packaging pass 100% before initiating deployment.
  2. **Image Packaging & Immutable Digest Push:**
     - Builds container using `linux/amd64` architecture.
     - Tags image with the full 40-character commit SHA (`${{ github.sha }}`).
     - Pushes image to Artifact Registry (`asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9bc98308/s9bc98308:<SHA>`).
     - Extracts the unique, immutable SHA256 image digest (`image@sha256:...`).
  3. **Atomic Release Script (`deploy/release.sh`):**
     - Updates Cloud Run migration job `s9bc98308-migrate` with the verified digest, command, Cloud SQL instance socket, and Secret Manager references.
     - Executes the migration job with `--wait` to ensure all database migrations complete successfully before application rollout.
     - Updates Cloud Run service `s9bc98308` by digest, switching 100% of live traffic to the newly verified container revision.
  4. **Post-Deployment Smoke Test (`deploy/smoke_test.py`):**
     - Queries public service URL with exponential retry for cold starts.
     - Asserts `GET /health` returns `200 OK`.
     - Asserts `GET /api/ready` returns `200 OK` (database operational).
     - Asserts `GET /` returns `200 OK` (React SPA entry HTML).
     - Executes authenticated workflow: `POST /api/auth/login`, queries `/api/items` with Bearer token, and executes `POST /api/auth/logout`.
  5. **Audit Summary:** Appends commit SHA, image digest, public service URL, and status to `$GITHUB_STEP_SUMMARY`.

### 4.2 Check C-06: Release Traceability and Running Revision Verification (R-07, R-08)
- **Reviewed Release PR:** Pull request from `lab5-staging` into `main` reviewed and approved by teammate.
- **Commit Traceability:**
  - Deployed revision running on Cloud Run maps directly to the commit SHA tagged in Artifact Registry.
  - Command to audit running commit:
    ```bash
    gcloud run services describe s9bc98308 --region=asia-southeast1 --format='value(spec.template.spec.containers[0].image)'
    ```
    Matches image tag in Artifact Registry:
    ```bash
    gcloud artifacts docker images list asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9bc98308/s9bc98308 --include-tags
    ```
- **Rollback Procedure:**
  - If a production defect occurs, dispatch `deploy.yml` with `image_tag=<PREVIOUS_GOOD_SHA>`.
  - The pipeline pulls the existing immutable image digest, applies migrations if required, and points Cloud Run to the previous working revision in under 60 seconds without rebuilding code.
