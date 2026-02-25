#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"
SERVICE_NAME="slides2gif-www"

echo "Deploying www service to Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID}

# Optional: load .env for GCS_CACHE_BUCKET etc. (secrets always come from GSM)
if [ -f ".env" ]; then
  echo "Loading .env for GCS_CACHE_BUCKET etc."
  set -a
  source .env
  set +a
fi

if [ -z "$GCS_CACHE_BUCKET" ]; then
  GCS_CACHE_BUCKET="slides2gif-cache"
fi

# Get png2gif service URL (must be deployed first)
PNG2GIF_SERVICE_NAME="slides2gif-png2gif"
PNG2GIF_URL=$(gcloud run services describe ${PNG2GIF_SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)' 2>/dev/null || echo "")

if [ -z "$PNG2GIF_URL" ]; then
  echo "⚠️  Warning: Could not find png2gif service URL. Make sure it's deployed first."
  echo "  You can set PNG2GIF_SERVICE_URL manually or deploy png2gif service first."
  if [ -z "$PNG2GIF_SERVICE_URL" ]; then
    echo "  Using PNG2GIF_SERVICE_URL from environment if set."
  fi
else
  PNG2GIF_SERVICE_URL="${PNG2GIF_URL}"
  echo "✅ Found png2gif service: ${PNG2GIF_SERVICE_URL}"
fi

# Build the Next.js app
echo "Building Next.js app..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# Require secrets in Google Secret Manager (we always use GSM)
for secret_name in secret-cookie-password oauth-client-id oauth-client-secret; do
  if ! gcloud secrets describe "${secret_name}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    echo "❌ Missing secret in GSM: ${secret_name}"
    echo "  Run: just verify-env  (from repo root) to see status."
    echo "  Create secrets: ./scripts/create-secret.sh ${secret_name}"
    exit 1
  fi
done
echo "✅ All required secrets present in Secret Manager"

# Base env vars (always set)
ENV_VARS=(
  "NODE_ENV=production"
  "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
  "GCS_CACHE_BUCKET=${GCS_CACHE_BUCKET}"
)
if [ -n "$PNG2GIF_SERVICE_URL" ]; then
  ENV_VARS+=("PNG2GIF_SERVICE_URL=${PNG2GIF_SERVICE_URL}")
fi

# Grant the www service account access to secrets before deploy
WWW_SA=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format 'value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")
if [ -z "$WWW_SA" ]; then
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format 'value(projectNumber)' 2>/dev/null || echo "")
  [ -n "$PROJECT_NUMBER" ] && WWW_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi
if [ -n "$WWW_SA" ]; then
  echo "Ensuring ${WWW_SA} can read secrets..."
  for secret_name in oauth-client-id oauth-client-secret secret-cookie-password; do
    if ! gcloud secrets get-iam-policy ${secret_name} --project ${PROJECT_ID} --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SA}"; then
      echo "  Granting access to ${secret_name}"
      gcloud secrets add-iam-policy-binding ${secret_name} \
        --member="serviceAccount:${WWW_SA}" \
        --role="roles/secretmanager.secretAccessor" \
        --project ${PROJECT_ID} \
        --quiet 2>/dev/null || true
    fi
  done
fi

# Deploy www service (secrets from GSM)
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  $(printf -- '--set-env-vars %s ' "${ENV_VARS[@]}") \
  --update-secrets "OAUTH_CLIENT_ID=oauth-client-id:latest" \
  --update-secrets "OAUTH_CLIENT_SECRET=oauth-client-secret:latest" \
  --update-secrets "SECRET_COOKIE_PASSWORD=secret-cookie-password:latest"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "Service URL: ${SERVICE_URL}"
