#!/bin/bash
# Grant the www Cloud Run service account access to Secret Manager secrets.
# Run this once if OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET / SECRET_COOKIE_PASSWORD
# show up empty in the www container, then redeploy: just deploy-www
set -e

PROJECT_ID="slides2gifcom"
REGION="us-central1"
SERVICE_NAME="slides2gif-www"

echo "Resolving www service account..."
WWW_SA=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")
if [ -z "$WWW_SA" ]; then
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format 'value(projectNumber)' 2>/dev/null || echo "")
  if [ -z "$PROJECT_NUMBER" ]; then
    echo "Could not get project number. Is gcloud configured for project ${PROJECT_ID}?"
    exit 1
  fi
  WWW_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  echo "Using default compute SA: ${WWW_SA}"
fi

for secret_name in oauth-client-id oauth-client-secret secret-cookie-password; do
  if ! gcloud secrets describe ${secret_name} --project ${PROJECT_ID} >/dev/null 2>&1; then
    echo "Secret ${secret_name} does not exist. Create it first (e.g. ./setup.sh or ./scripts/create-secret.sh ${secret_name})"
    exit 1
  fi
  echo "Granting ${WWW_SA} access to ${secret_name}..."
  gcloud secrets add-iam-policy-binding ${secret_name} \
    --member="serviceAccount:${WWW_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project ${PROJECT_ID} \
    --quiet
done

echo ""
echo "Done. Redeploy www so the new revision gets secret-backed env vars:"
echo "  just deploy-www"
