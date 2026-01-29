#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"
SERVICE_NAME="slides2gif-www"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying www service to Cloud Run${NC}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID}

# Read environment variables from .env file if it exists
if [ -f ".env" ]; then
  echo -e "${BLUE}📝 Loading environment variables from .env${NC}"
  set -a
  source .env
  set +a
fi

# Use PROD vars if available, otherwise fall back to regular vars
OAUTH_CLIENT_ID_FINAL="${OAUTH_CLIENT_ID_PROD:-$OAUTH_CLIENT_ID}"
OAUTH_CLIENT_SECRET_FINAL="${OAUTH_CLIENT_SECRET_PROD:-$OAUTH_CLIENT_SECRET}"

# Check required environment variables
if [ -z "$OAUTH_CLIENT_ID_FINAL" ]; then
  echo -e "${YELLOW}⚠️  Warning: OAUTH_CLIENT_ID or OAUTH_CLIENT_ID_PROD not set${NC}"
fi

if [ -z "$OAUTH_CLIENT_SECRET_FINAL" ]; then
  echo -e "${YELLOW}⚠️  Warning: OAUTH_CLIENT_SECRET or OAUTH_CLIENT_SECRET_PROD not set${NC}"
fi

if [ -z "$SECRET_COOKIE_PASSWORD" ]; then
  echo -e "${YELLOW}⚠️  Warning: SECRET_COOKIE_PASSWORD not set${NC}"
fi

if [ -z "$GCS_CACHE_BUCKET" ]; then
  echo -e "${YELLOW}⚠️  Warning: GCS_CACHE_BUCKET not set, defaulting to slides2gif-cache${NC}"
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
  echo -e "${YELLOW}⚠️  Warning: Could not find png2gif service URL. Make sure it's deployed first.${NC}"
  echo "  You can set PNG2GIF_SERVICE_URL manually or deploy png2gif service first."
  if [ -z "$PNG2GIF_SERVICE_URL" ]; then
    echo -e "${YELLOW}  Using PNG2GIF_SERVICE_URL from environment if set.${NC}"
  fi
else
  PNG2GIF_SERVICE_URL="${PNG2GIF_URL}"
  echo -e "${GREEN}✅ Found png2gif service: ${PNG2GIF_SERVICE_URL}${NC}"
fi

# Build the Next.js app
echo "Building Next.js app..."
npm run build

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}❌ Build failed!${NC}"
  exit 1
fi

# Prefer Secret Manager for production secrets (same as root deploy.sh)
USE_SECRETS=false
if gcloud secrets describe secret-cookie-password --project ${PROJECT_ID} >/dev/null 2>&1 \
   && gcloud secrets describe oauth-client-id --project ${PROJECT_ID} >/dev/null 2>&1 \
   && gcloud secrets describe oauth-client-secret --project ${PROJECT_ID} >/dev/null 2>&1; then
  USE_SECRETS=true
  echo -e "${GREEN}✅ Using Secret Manager for OAUTH_* and SECRET_COOKIE_PASSWORD${NC}"
fi

# Base env vars (always set)
ENV_VARS=(
  "NODE_ENV=production"
  "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
  "GCS_CACHE_BUCKET=${GCS_CACHE_BUCKET}"
)
if [ -n "$PNG2GIF_SERVICE_URL" ]; then
  ENV_VARS+=("PNG2GIF_SERVICE_URL=${PNG2GIF_SERVICE_URL}")
fi

# When using secrets, grant the www service account access BEFORE deploy so the new revision can read them
if [ "$USE_SECRETS" = true ]; then
  WWW_SA=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format 'value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")
  if [ -z "$WWW_SA" ]; then
    PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format 'value(projectNumber)' 2>/dev/null || echo "")
    [ -n "$PROJECT_NUMBER" ] && WWW_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  fi
  if [ -n "$WWW_SA" ]; then
    echo -e "${BLUE}Ensuring ${WWW_SA} can read secrets...${NC}"
    for secret_name in oauth-client-id oauth-client-secret secret-cookie-password; do
      if ! gcloud secrets get-iam-policy ${secret_name} --project ${PROJECT_ID} --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SA}"; then
        echo -e "  Granting access to ${secret_name}"
        gcloud secrets add-iam-policy-binding ${secret_name} \
          --member="serviceAccount:${WWW_SA}" \
          --role="roles/secretmanager.secretAccessor" \
          --project ${PROJECT_ID} \
          --quiet 2>/dev/null || true
      fi
    done
  fi
fi

# Deploy www service
echo "Deploying to Cloud Run..."
if [ "$USE_SECRETS" = true ]; then
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
else
  # No Secret Manager: use .env (iron-session needs SECRET_COOKIE_PASSWORD)
  if [ -z "$SECRET_COOKIE_PASSWORD" ]; then
    echo -e "${YELLOW}❌ SECRET_COOKIE_PASSWORD is required for production.${NC}"
    echo "  Create secrets and re-run, or use: just deploy (root deploy uses Secret Manager)"
    echo "  To create secrets: ./setup.sh  or  ./scripts/create-secret.sh secret-cookie-password"
    exit 1
  fi
  ENV_VARS+=("OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID_FINAL}" "OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET_FINAL}" "SECRET_COOKIE_PASSWORD=${SECRET_COOKIE_PASSWORD}")
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
    $(printf -- '--set-env-vars %s ' "${ENV_VARS[@]}")
fi

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
