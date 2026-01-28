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

# Get the service account email for the www service
WWW_SERVICE_ACCOUNT="${WWW_SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${BLUE}Granting ${WWW_SERVICE_NAME} permission to invoke ${PNG2GIF_SERVICE_NAME}...${NC}"

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
