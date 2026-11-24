# Lab 5 deployment (docs/labs/lab05/deployment.md)

Status: first draft written after the first manual deployment (24 Nov 2026). Sections marked [TO COMPLETE] depend on later Issues (L5-6, L5-7, L5-8). No secret value appears in this file.

## 1. Stack and deviations from the reference

| Item | Choice |
|---|---|
| Application | npm-workspaces monorepo: `backend` (Node.js 24, TypeScript, Express, Zod, Prisma 6, JWT + argon2) and `frontend` (React, Vite, React Router) |
| Database | PostgreSQL 16 (Cloud SQL for PostgreSQL, instance `s9bc98308-pg`, tier db-f1-micro) |
| Packaging | One multi-stage `Dockerfile`: one container serves the API and the built frontend on the same origin |
| Runtime | Cloud Run service `s9bc98308`, 0 to 1 instances, port 8080 |
| Migrations and seed | Cloud Run job `s9bc98308-migrate`, run before the service is updated |
| Registry | Artifact Registry repository `s9bc98308` ... see section 3 |
| CI | GitHub Actions, workflow `ci-docker.yml`, job `test-and-docker` |

Deviations from the TokTickIT reference:
- The course portal created the GCP resources, so no manual project, billing or resource creation was done.
- Prisma CLI and `tsx` stay in the final image (full `node_modules`) because the migration job runs `prisma migrate deploy` and the seed from the same image.
- The first deployment was done by hand with the course kit from the `lab5-staging` branch (bootstrap). Releases from `main` through the pipeline are described in section 6 [TO COMPLETE].

## 2. Environment variables

| Variable | Role | Secret? | Where the value comes from |
|---|---|---|---|
| `NODE_ENV` | `production` enables static frontend serving and strict config | No | Set in the Dockerfile; `development` locally |
| `PORT` | Port the server listens on | No | Set by Cloud Run (8080); 3000 locally |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | Secret Manager entry `s9bc98308-database-url`, attached by the portal (Cloud SQL unix socket); local value in `.env` |
| `JWT_SECRET` | Signs login tokens (32 characters or more) | **Yes** | Secret slot `s9bc98308-app-secret-1`, mapped with `kit.sh secrets map JWT_SECRET 1`; random value generated at deployment, never displayed |
| `JWT_EXPIRES_IN_MINUTES` | Token lifetime | No | Default 60 |
| `SEED_DEMO_PASSWORD` | Password given to the demo accounts by the seed; the seed refuses the default value in production | **Yes** | Secret slot `s9bc98308-app-secret-2`, copied from the portal secret `s9bc98308-demo-password` |
| `CORS_ORIGIN` | Allowed browser origin | No | Default `http://localhost:5173`; unused in production because the site and the API share one origin (see limitations) |
| `VITE_API_URL` | Development API address for the frontend | No | Default `http://localhost:3000`; the production build uses relative `/api` paths |
| `CLIENT_DIST_PATH` | Location of the built frontend | No | Set to `/app/frontend/dist` in the image |
| `TZ` | Timezone of the service | No | `UTC`, set with `kit.sh env set TZ=UTC` (used to create a new revision for the persistence check) |
| `ADMIN_PASSWORD` | Injected by the portal | **Yes** | Portal secret `s9bc98308-admin-password`; not read by the application |

`.env.example` lists the variables the application reads, with dummy values. Real values are never committed (`.env*` is git-ignored and excluded by `.dockerignore`).

## 3. GCP resources (names, not secrets)

- Project `cpe-se-course-2026`, region `asia-southeast1`, team prefix `s9bc98308`.
- Cloud Run service `s9bc98308`; migration job `s9bc98308-migrate`; Cloud SQL `s9bc98308-pg`; database `s9bc98308`.
- Image repository: `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9bc98308/s9bc98308`.
- Secrets: `s9bc98308-database-url`, `s9bc98308-admin-password`, `s9bc98308-demo-password`, and slots `s9bc98308-app-secret-1` to `5`.
- GitHub repository variables (set manually, the portal did not create them): `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`. The GitHub environment `demo` does not exist yet [TO COMPLETE if the deploy workflow uses it].
- Public URL: https://s9bc98308-4d7hbszvwq-as.a.run.app

## 4. Commands

Local development (repository root; use `npm ci`, never `npm install`):

```bash
npm ci --include=dev
npx prisma generate --schema=backend/prisma/schema.prisma   # required before build and tests
npm run build
npm test                                                     # needs a PostgreSQL database named inventory_test and a local .env.test
npm run test:e2e                                             # Playwright, from the frontend workspace
```

Local run with Docker (clean clone, `.env` copied from `.env.example`, with `SEED_DEMO_PASSWORD` changed to a local value):

```bash
docker compose up --build        # db, then one-shot migrate and seed, then the app on port 3000
curl -i http://localhost:3000/health
curl -i http://localhost:3000/api/ready
```

Migration and seed (inside the image, as run by the Cloud Run job):

```bash
npm run db:migrate --workspace=backend && npm run db:seed --workspace=backend
```

## 5. First deployment (manual bootstrap, 24 Nov 2026)

Run by the team from a clone at commit `6f7c6902072812cd5ea0f10881516a0e65aaa45e` (`lab5-staging` after PR #40). Every gcloud command was read before it was run, and no secret value was typed in a chat or committed.

1. Sign in and select the project: `gcloud auth login`, then `gcloud config set project cpe-se-course-2026`; configure Docker for the registry: `gcloud auth configure-docker asia-southeast1-docker.pkg.dev`.
2. Build and push, tagging the image with the full commit SHA:
   ```bash
   SHA=$(git rev-parse HEAD)
   IMAGE="asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9bc98308/s9bc98308:$SHA"
   docker build --platform linux/amd64 -t "$IMAGE" .
   docker push "$IMAGE"
   ```
   Pushed digest: `sha256:b848beae3a6555e3c42b912324db26db2055132612d779848853785515c478c3`.
3. With the course kit (kept outside the repository): add `MIGRATE_COMMAND='npm run db:migrate --workspace=backend && npm run db:seed --workspace=backend'` to the kit's `resources.env`.
4. Fill the secret slots from hidden input or a pipe, never from an argument, then map them:
   ```bash
   ./kit.sh secrets add 1 --from-stdin     # random JWT_SECRET piped in, never displayed
   ./kit.sh secrets map JWT_SECRET 1
   ./kit.sh secrets add 2 --from-stdin     # value copied from the portal secret s9bc98308-demo-password
   ./kit.sh secrets map SEED_DEMO_PASSWORD 2
   ./kit.sh secrets list                   # slots 1 and 2 must report "has a value"
   ```
5. Preview, then deploy by digest (the job is updated with the image and the migration command, executed, and only then is the service updated):
   ```bash
   ./kit.sh --dry-run deploy --image <registry>/s9bc98308@sha256:b848bea...
   ./kit.sh deploy --image <registry>/s9bc98308@sha256:b848bea...
   ```
   The job placeholder shipped by the portal exits with an error, so its command must be replaced together with its image.
6. Verify: `./kit.sh status`, `curl -i <url>/health`, `curl -i <url>/api/ready` (both 200).

Result: job execution `s9bc98308-migrate-zt2qf` succeeded; service revision `s9bc98308-00002-24z` serving 100 % of the traffic.

Persistence check: `./kit.sh env set TZ=UTC` created revision `s9bc98308-00003-stm` on the same image; the requests created before (EQ-001 fulfilled, EQ-007 pending) were still listed afterwards (evidence C-05, to be repeated after a release by the pipeline).

## 6. Release procedure and finding the running commit [TO COMPLETE after L5-7]

Target procedure: reviewed Issue branch, pull request into `lab5-staging` (CI `test-and-docker` must pass), release pull request from `lab5-staging` into `main`, merge, then the `deploy.yml` workflow builds the image tagged with the full commit SHA, runs the migration job and updates the service by digest, followed by a smoke test.

Finding the commit that is running today:
- `./kit.sh status` shows the latest revision and the image digest.
- The image tag in the registry is the full commit SHA: `gcloud artifacts docker images list asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s9bc98308/s9bc98308 --include-tags`.
- In the pipeline summary: commit, digest and URL [TO COMPLETE].

## 7. Known limitations

- `SEED_DEMO_PASSWORD` is attached to the web service as well as to the job, because the course kit applies the same secrets to both. The application treats it as optional for the server and only the seed script requires it.
- `ADMIN_PASSWORD` is injected by the portal but not used by the application.
- `CORS_ORIGIN` keeps its development default in production (`http://localhost:5173`). It has no effect on same-origin requests; it can be set with `kit.sh env set CORS_ORIGIN=<public url>`.
- The Cloud Run service scales to zero, so the first request after a pause is slow.
- The image contains tests and development tooling (see section 1).
- Playwright end-to-end tests run in the CI workflow [TO CONFIRM test counts].
- The first deployment was manual (bootstrap) and started from `lab5-staging`, not from `main`.
