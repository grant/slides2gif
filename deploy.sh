#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"

# Determine environment from DEPLOY_ENV or default to production
DEPLOY_ENV="${DEPLOY_ENV:-production}"
if [ "$DEPLOY_ENV" = "staging" ]; then
  WWW_SERVICE_NAME="slides2gif-www-staging"
  PNG2GIF_SERVICE_NAME="slides2gif-png2gif-staging"
else
  WWW_SERVICE_NAME="slides2gif-www"
  PNG2GIF_SERVICE_NAME="slides2gif-png2gif"
fi

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"

echo -e "${BLUE}🚀 Deploying slides2gif services to Cloud Run${NC}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Environment: ${DEPLOY_ENV}"
echo "Services: ${WWW_SERVICE_NAME}, ${PNG2GIF_SERVICE_NAME}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID} 2>/dev/null || true

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo -e "${CROSS} Not authenticated. Please run: gcloud auth login${NC}"
  exit 1
fi

# Check if secrets exist in Secret Manager
echo -e "${ARROW} Checking secrets in Secret Manager...${NC}"
SECRETS_EXIST=true
MISSING_SECRETS=()

for secret_name in "oauth-client-id" "oauth-client-secret" "secret-cookie-password"; do
  if ! gcloud secrets describe ${secret_name} --project ${PROJECT_ID} > /dev/null 2>&1; then
    SECRETS_EXIST=false
    MISSING_SECRETS+=("${secret_name}")
  fi
done

if [ "$SECRETS_EXIST" = false ]; then
  echo -e "${CROSS} Missing secrets in Secret Manager:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "  - ${secret}"
  done
  echo ""
  echo "Run './setup.sh' to create secrets, or create them manually:"
  echo "  gcloud secrets create <secret-name> --data-file=- --project ${PROJECT_ID}"
  exit 1
fi

echo -e "${CHECK} All required secrets found in Secret Manager"

# Set GCS_CACHE_BUCKET (not a secret, just config)
if [ -z "$GCS_CACHE_BUCKET" ]; then
  GCS_CACHE_BUCKET="slides2gif-cache"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Deployment Checklist${NC}"
echo ""

echo -e "${BLUE}1. Deploying png2gif service...${NC}"
cd png2gif

echo -e "  ${ARROW} Building and deploying..."
if gcloud run deploy ${PNG2GIF_SERVICE_NAME} \
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
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars "GCS_CACHE_BUCKET=${GCS_CACHE_BUCKET}" \
  --quiet; then
  
  # Get the png2gif service URL
  PNG2GIF_URL=$(gcloud run services describe ${PNG2GIF_SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format 'value(status.url)')
  
  echo -e "  ${CHECK} png2gif service deployed: ${PNG2GIF_URL}"
else
  echo -e "  ${CROSS} Failed to deploy png2gif service"
  exit 1
fi

cd ..

echo ""
echo -e "${BLUE}2. Deploying www service...${NC}"
cd www

echo -e "  ${ARROW} Building Next.js app..."
if npm run build; then
  echo -e "  ${CHECK} Build successful"
else
  echo -e "  ${CROSS} Build failed"
  exit 1
fi

# Optional Picker secrets (mount if they exist)
WWW_SECRETS=(
  "OAUTH_CLIENT_ID=oauth-client-id:latest"
  "OAUTH_CLIENT_SECRET=oauth-client-secret:latest"
  "SECRET_COOKIE_PASSWORD=secret-cookie-password:latest"
)
for picker_secret in "google-cloud-project-number:GOOGLE_CLOUD_PROJECT_NUMBER" "google-picker-developer-key:GOOGLE_PICKER_DEVELOPER_KEY"; do
  IFS=':' read -r secret_name env_var <<< "$picker_secret"
  if gcloud secrets describe "${secret_name}" --project ${PROJECT_ID} > /dev/null 2>&1; then
    WWW_SECRETS+=("${env_var}=${secret_name}:latest")
  fi
done

echo -e "  ${ARROW} Deploying to Cloud Run..."
if gcloud run deploy ${WWW_SERVICE_NAME} \
  --source . \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-env-vars "GCS_CACHE_BUCKET=${GCS_CACHE_BUCKET}" \
  --set-env-vars "PNG2GIF_SERVICE_URL=${PNG2GIF_URL}" \
  $(printf -- '--update-secrets %s ' "${WWW_SECRETS[@]}") \
  --quiet; then
  
  # Get the www service URL
  WWW_URL=$(gcloud run services describe ${WWW_SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format 'value(status.url)')
  
  echo -e "  ${CHECK} www service deployed: ${WWW_URL}"
else
  echo -e "  ${CROSS} Failed to deploy www service"
  exit 1
fi

cd ..

echo ""
echo -e "${BLUE}3. Verifying secret access...${NC}"
# Ensure service account has access to secrets (they're granted in setup.sh, but verify)
WWW_SERVICE_ACCOUNT="${WWW_SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRETS_OK=true

for secret_name in "oauth-client-id" "oauth-client-secret" "secret-cookie-password" "google-cloud-project-number" "google-picker-developer-key"; do
  if ! gcloud secrets describe ${secret_name} --project ${PROJECT_ID} > /dev/null 2>&1; then
    continue
  fi
  if gcloud secrets get-iam-policy ${secret_name} \
    --project ${PROJECT_ID} \
    --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SERVICE_ACCOUNT}"; then
    echo -e "  ${CHECK} ${WWW_SERVICE_ACCOUNT} has access to ${secret_name}"
  else
    echo -e "  ${ARROW} Granting ${WWW_SERVICE_ACCOUNT} access to ${secret_name}..."
    if gcloud secrets add-iam-policy-binding ${secret_name} \
      --member="serviceAccount:${WWW_SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --project ${PROJECT_ID} \
      --quiet 2>/dev/null; then
      echo -e "    ${CHECK} Access granted"
    else
      echo -e "    ${YELLOW}⚠️  Could not grant access (service account may not exist yet)${NC}"
      SECRETS_OK=false
    fi
  fi
done

echo ""
echo -e "${BLUE}4. Setting up IAM permissions...${NC}"
echo -e "  ${ARROW} Granting www service permission to invoke png2gif..."

if gcloud run services add-iam-policy-binding ${PNG2GIF_SERVICE_NAME} \
  --region ${REGION} \
  --member="serviceAccount:${WWW_SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --project ${PROJECT_ID} \
  --quiet 2>/dev/null; then
  echo -e "  ${CHECK} IAM permissions configured"
else
  # Check if permission already exists
  if gcloud run services get-iam-policy ${PNG2GIF_SERVICE_NAME} \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SERVICE_ACCOUNT}"; then
    echo -e "  ${CHECK} IAM permissions already configured"
  else
    echo -e "  ${YELLOW}⚠️  Failed to set IAM permissions (service account may not exist yet)${NC}"
    echo "    Permissions will be set automatically after first deployment"
  fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Services deployed:"
echo -e "  ${GREEN}www:${NC}     ${WWW_URL}"
echo -e "  ${GREEN}png2gif:${NC} ${PNG2GIF_URL}"
echo ""
