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

# Prepare environment variables
ENV_VARS=(
  "NODE_ENV=production"
  "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
  "OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID_FINAL}"
  "OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET_FINAL}"
  "SECRET_COOKIE_PASSWORD=${SECRET_COOKIE_PASSWORD}"
  "GCS_CACHE_BUCKET=${GCS_CACHE_BUCKET}"
)

if [ -n "$PNG2GIF_SERVICE_URL" ]; then
  ENV_VARS+=("PNG2GIF_SERVICE_URL=${PNG2GIF_SERVICE_URL}")
fi

# Deploy www service
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
  $(printf -- '--set-env-vars %s ' "${ENV_VARS[@]}")

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
