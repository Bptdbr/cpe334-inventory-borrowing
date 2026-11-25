#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# deploy/release.sh - Deployment Script for Equipment Inventory and Borrowing System
# Implements atomic database migration and service update by digest on GCP Cloud Run.
# ==============================================================================

echo "=== [deploy/release.sh] Starting Deployment Sequence ==="

# 1. Validation of required inputs
: "${IMAGE_DIGEST:?Error: IMAGE_DIGEST must be set (e.g. repo@sha256:...)}"
: "${GCP_REGION:?Error: GCP_REGION must be set}"
: "${GCP_PROJECT_ID:?Error: GCP_PROJECT_ID must be set}"

SERVICE_NAME="${SERVICE_NAME:-s9bc98308}"
JOB_NAME="${JOB_NAME:-s9bc98308-migrate}"
CLOUDSQL_INSTANCE="cpe-se-course-2026:asia-southeast1:s9bc98308-pg"

echo "Configuration:"
echo "  Project:            ${GCP_PROJECT_ID}"
echo "  Region:             ${GCP_REGION}"
echo "  Service:            ${SERVICE_NAME}"
echo "  Migration Job:      ${JOB_NAME}"
echo "  Cloud SQL Instance: ${CLOUDSQL_INSTANCE}"
echo "  Target Digest:      ${IMAGE_DIGEST}"

# 2. Update Migration Job with new image, command, Cloud SQL socket and secrets
echo "[1/3] Updating migration job '${JOB_NAME}'..."
gcloud run jobs update "${JOB_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --region="${GCP_REGION}" \
  --image="${IMAGE_DIGEST}" \
  --command sh \
  --args "^|^-c|npm run db:migrate --workspace=backend && npm run db:seed --workspace=backend" \
  --add-cloudsql-instances="${CLOUDSQL_INSTANCE}" \
  --update-secrets="JWT_SECRET=s9bc98308-app-secret-1:latest,SEED_DEMO_PASSWORD=s9bc98308-app-secret-2:latest" \
  --max-retries=0 \
  --task-timeout=600s

# 3. Execute Migration Job and wait for completion
echo "[2/3] Executing migration job '${JOB_NAME}' and waiting for completion..."
gcloud run jobs execute "${JOB_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --region="${GCP_REGION}" \
  --wait

echo "[+] Migration and seed job completed successfully."

# 4. Update Cloud Run Service with the verified digest
echo "[3/3] Updating Cloud Run service '${SERVICE_NAME}' by digest..."
gcloud run services update "${SERVICE_NAME}" \
  --project="${GCP_PROJECT_ID}" \
  --region="${GCP_REGION}" \
  --image="${IMAGE_DIGEST}" \
  --add-cloudsql-instances="${CLOUDSQL_INSTANCE}" \
  --update-secrets="JWT_SECRET=s9bc98308-app-secret-1:latest,SEED_DEMO_PASSWORD=s9bc98308-app-secret-2:latest" \
  --update-env-vars="TZ=UTC"

# 5. Extract and display public service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --project="${GCP_PROJECT_ID}" --region="${GCP_REGION}" --format='value(status.url)')
echo "PUBLIC_SERVICE_URL=${SERVICE_URL}" >> "${GITHUB_ENV:-/dev/null}"
echo "SERVICE_URL=${SERVICE_URL}" >> "${GITHUB_OUTPUT:-/dev/null}"

echo "=== [deploy/release.sh] Deployment Completed Successfully ==="
echo "Public Service URL: ${SERVICE_URL}"
