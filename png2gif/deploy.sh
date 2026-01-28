#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"
SERVICE_NAME="slides2gif-png2gif"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying png2gif service to Cloud Run${NC}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID}

# Deploy png2gif service
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo "Note: Make sure the www service has permission to invoke this service."
echo "Run the following command to grant permissions:"
echo ""
echo "  gcloud run services add-iam-policy-binding ${SERVICE_NAME} \\"
echo "    --region ${REGION} \\"
echo "    --member=\"serviceAccount:slides2gif-www@${PROJECT_ID}.iam.gserviceaccount.com\" \\"
echo "    --role=\"roles/run.invoker\" \\"
echo "    --project ${PROJECT_ID}"
