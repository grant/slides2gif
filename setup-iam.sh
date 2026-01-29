#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"
WWW_SERVICE_NAME="slides2gif-www"
PNG2GIF_SERVICE_NAME="slides2gif-png2gif"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Setting up IAM permissions for service-to-service communication${NC}"
echo "Project: ${PROJECT_ID}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID}

# Resolve the actual service account the www service runs as (or will run as)
WWW_SERVICE_ACCOUNT=$(gcloud run services describe ${WWW_SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")
if [ -z "$WWW_SERVICE_ACCOUNT" ]; then
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format 'value(projectNumber)' 2>/dev/null || echo "")
  if [ -n "$PROJECT_NUMBER" ]; then
    WWW_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    echo -e "${BLUE}www service not found; using default compute SA: ${WWW_SERVICE_ACCOUNT}${NC}"
  else
    WWW_SERVICE_ACCOUNT="${WWW_SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
  fi
fi

echo -e "${BLUE}Granting ${WWW_SERVICE_ACCOUNT} permission to invoke ${PNG2GIF_SERVICE_NAME}...${NC}"

# Grant the www service permission to invoke the png2gif service
gcloud run services add-iam-policy-binding ${PNG2GIF_SERVICE_NAME} \
  --region ${REGION} \
  --member="serviceAccount:${WWW_SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --project ${PROJECT_ID}

echo ""
echo -e "${GREEN}✅ IAM permissions configured!${NC}"
echo ""
echo "The ${WWW_SERVICE_NAME} service can now invoke ${PNG2GIF_SERVICE_NAME}."
