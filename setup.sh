#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"

echo -e "${BLUE}🔧 Setting up slides2gif project on Google Cloud${NC}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Track what's been done
STEPS_COMPLETED=0
STEPS_TOTAL=0

check_step() {
  local description="$1"
  local command="$2"
  STEPS_TOTAL=$((STEPS_TOTAL + 1))
  
  echo -n "  ${ARROW} $description... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${CHECK}"
    STEPS_COMPLETED=$((STEPS_COMPLETED + 1))
    return 0
  else
    echo -e "${CROSS}"
    return 1
  fi
}

run_step() {
  local description="$1"
  local command="$2"
  
  echo -e "  ${ARROW} $description..."
  if eval "$command"; then
    echo -e "    ${CHECK} Done"
    return 0
  else
    echo -e "    ${CROSS} Failed"
    return 1
  fi
}

# Step 1: Check authentication
echo -e "${BLUE}1. Authentication${NC}"
if check_step "Checking gcloud authentication" "gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q ."; then
  ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)
  echo "    Logged in as: $ACCOUNT"
else
  echo -e "    ${YELLOW}⚠️  Not authenticated. Run: gcloud auth login${NC}"
  exit 1
fi
echo ""

# Step 2: Set project
echo -e "${BLUE}2. Project Configuration${NC}"
if check_step "Checking if project is set" "[ \"\$(gcloud config get-value project 2>/dev/null)\" = \"${PROJECT_ID}\" ]"; then
  echo "    Project already set to ${PROJECT_ID}"
else
  run_step "Setting project to ${PROJECT_ID}" "gcloud config set project ${PROJECT_ID}"
fi
echo ""

# Step 3: Enable APIs
echo -e "${BLUE}3. Enabling Required APIs${NC}"
APIS=(
  "run.googleapis.com:Cloud Run API"
  "cloudbuild.googleapis.com:Cloud Build API"
  "slides.googleapis.com:Google Slides API"
  "storage.googleapis.com:Cloud Storage API"
  "iam.googleapis.com:Identity and Access Management API"
)

for api_info in "${APIS[@]}"; do
  IFS=':' read -r api name <<< "$api_info"
  if check_step "$name" "gcloud services list --enabled --filter='name:${api}' --format='value(name)' | grep -q '${api}'"; then
    :
  else
    run_step "Enabling $name" "gcloud services enable ${api} --project ${PROJECT_ID}"
  fi
done
echo ""

# Step 4: Create GCS buckets
echo -e "${BLUE}4. Cloud Storage Buckets${NC}"
BUCKETS=(
  "slides2gif-cache:Public read access for cached slide thumbnails"
  "slides2gif-upload-test:Public read access for uploaded GIFs"
)

for bucket_info in "${BUCKETS[@]}"; do
  IFS=':' read -r bucket description <<< "$bucket_info"
  if check_step "Bucket '${bucket}' exists" "gsutil ls -b gs://${bucket} 2>/dev/null"; then
    echo "    ${bucket} already exists"
  else
    run_step "Creating bucket '${bucket}'" "gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${bucket}"
    run_step "Making ${bucket} publicly readable" "gsutil iam ch allUsers:objectViewer gs://${bucket}"
  fi
done
echo ""

# Step 5: Create service account (if needed)
echo -e "${BLUE}5. Service Account${NC}"
SERVICE_ACCOUNT_NAME="slides2gif-service-account"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if check_step "Service account exists" "gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} --project ${PROJECT_ID} 2>/dev/null"; then
  echo "    Service account already exists"
else
  run_step "Creating service account" "gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} --display-name='Slides2GIF Service Account' --project ${PROJECT_ID}"
fi

# Grant storage permissions
if check_step "Service account has storage.admin role" "gcloud projects get-iam-policy ${PROJECT_ID} --flatten='bindings[].members' --filter='bindings.members:serviceAccount:${SERVICE_ACCOUNT_EMAIL}' --format='value(bindings.role)' | grep -q 'roles/storage.admin'"; then
  echo "    Storage permissions already granted"
else
  run_step "Granting storage.admin role" "gcloud projects add-iam-policy-binding ${PROJECT_ID} --member='serviceAccount:${SERVICE_ACCOUNT_EMAIL}' --role='roles/storage.admin'"
fi
echo ""

# Step 6: Google Cloud Secret Manager
echo -e "${BLUE}6. Google Cloud Secret Manager${NC}"

# Enable Secret Manager API
if check_step "Secret Manager API enabled" "gcloud services list --enabled --filter='name:secretmanager.googleapis.com' --format='value(name)' | grep -q 'secretmanager.googleapis.com'"; then
  :
else
  run_step "Enabling Secret Manager API" "gcloud services enable secretmanager.googleapis.com --project ${PROJECT_ID}"
fi

# Define required secrets
SECRETS=(
  "oauth-client-id:OAuth Client ID"
  "oauth-client-secret:OAuth Client Secret"
  "secret-cookie-password:Session cookie encryption secret"
)

# Check if secrets exist, create if missing
ENV_FILE="www/.env.local"
HAS_LOCAL_SECRETS=false

if [ -f "$ENV_FILE" ]; then
  echo -e "  ${CHECK} Found $ENV_FILE for local development"
  set -a
  source "$ENV_FILE"
  set +a
  HAS_LOCAL_SECRETS=true
fi

for secret_info in "${SECRETS[@]}"; do
  IFS=':' read -r secret_name secret_description <<< "$secret_info"
  SECRET_PATH="projects/${PROJECT_ID}/secrets/${secret_name}"
  
  if check_step "Secret '${secret_name}' exists" "gcloud secrets describe ${secret_name} --project ${PROJECT_ID} > /dev/null 2>&1"; then
    echo "    Secret '${secret_name}' already exists in Secret Manager"
  else
    # Try to create from .env.local if available
    SECRET_VALUE=""
    case "$secret_name" in
      "oauth-client-id")
        SECRET_VALUE="${OAUTH_CLIENT_ID_PROD:-$OAUTH_CLIENT_ID}"
        ;;
      "oauth-client-secret")
        SECRET_VALUE="${OAUTH_CLIENT_SECRET_PROD:-$OAUTH_CLIENT_SECRET}"
        ;;
      "secret-cookie-password")
        SECRET_VALUE="${SECRET_COOKIE_PASSWORD}"
        ;;
    esac
    
    # Check if value looks like a real secret (not a placeholder)
    IS_PLACEHOLDER=false
    if [[ "$SECRET_VALUE" == *"your-"* ]] || \
       [[ "$SECRET_VALUE" == *"placeholder"* ]] || \
       [[ -z "$SECRET_VALUE" ]] || \
       [[ ${#SECRET_VALUE} -lt 10 ]]; then
      IS_PLACEHOLDER=true
    fi
    
    if [ -n "$SECRET_VALUE" ] && [ "$IS_PLACEHOLDER" = false ]; then
      echo -e "    ${ARROW} Creating secret '${secret_name}' from .env.local..."
      if echo -n "$SECRET_VALUE" | gcloud secrets create ${secret_name} \
        --data-file=- \
        --replication-policy="automatic" \
        --project ${PROJECT_ID} 2>/dev/null; then
        echo -e "      ${CHECK} Created"
      else
        echo -e "      ${CROSS} Failed to create (may already exist or have permission issues)"
      fi
    else
      echo -e "    ${YELLOW}⚠️  Secret '${secret_name}' not found in .env.local or is a placeholder${NC}"
      echo "      Create it manually:"
      echo "        ./scripts/create-secret.sh ${secret_name}"
      echo "      Or:"
      echo "        echo -n '<value>' | gcloud secrets create ${secret_name} \\"
      echo "          --data-file=- \\"
      echo "          --replication-policy='automatic' \\"
      echo "          --project ${PROJECT_ID}"
    fi
  fi
done

# Grant Cloud Run service account access to secrets
# Note: Service accounts are created automatically when services are deployed
# We'll grant permissions here, and they'll take effect once services exist
WWW_SERVICE_ACCOUNT="slides2gif-www@${PROJECT_ID}.iam.gserviceaccount.com"
STAGING_WWW_SERVICE_ACCOUNT="slides2gif-www-staging@${PROJECT_ID}.iam.gserviceaccount.com"

for secret_info in "${SECRETS[@]}"; do
  IFS=':' read -r secret_name secret_description <<< "$secret_info"
  
  # Only grant if secret exists
  if gcloud secrets describe ${secret_name} --project ${PROJECT_ID} > /dev/null 2>&1; then
    # Grant access to production service account
    if gcloud secrets get-iam-policy ${secret_name} \
      --project ${PROJECT_ID} \
      --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SERVICE_ACCOUNT}"; then
      echo "    ${WWW_SERVICE_ACCOUNT} already has access to ${secret_name}"
    else
      # Grant permission (will work once service account exists)
      run_step "Granting ${WWW_SERVICE_ACCOUNT} access to ${secret_name}" \
        "gcloud secrets add-iam-policy-binding ${secret_name} \
        --member='serviceAccount:${WWW_SERVICE_ACCOUNT}' \
        --role='roles/secretmanager.secretAccessor' \
        --project ${PROJECT_ID}" || echo "      (Service account will be created on first deployment)"
    fi
    
    # Grant access to staging service account
    if gcloud secrets get-iam-policy ${secret_name} \
      --project ${PROJECT_ID} \
      --format='value(bindings[].members)' 2>/dev/null | grep -q "${STAGING_WWW_SERVICE_ACCOUNT}"; then
      echo "    ${STAGING_WWW_SERVICE_ACCOUNT} already has access to ${secret_name}"
    else
      run_step "Granting ${STAGING_WWW_SERVICE_ACCOUNT} access to ${secret_name}" \
        "gcloud secrets add-iam-policy-binding ${secret_name} \
        --member='serviceAccount:${STAGING_WWW_SERVICE_ACCOUNT}' \
        --role='roles/secretmanager.secretAccessor' \
        --project ${PROJECT_ID}" || echo "      (Service account will be created on first deployment)"
    fi
  fi
done

echo ""
echo -e "  ${BLUE}Note:${NC} For local development, use www/.env.local (gitignored)"
echo -e "  For production, secrets are stored in Google Cloud Secret Manager"
echo ""

# Step 7: Application Default Credentials
echo -e "${BLUE}7. Application Default Credentials${NC}"
if check_step "ADC configured" "gcloud auth application-default print-access-token > /dev/null 2>&1"; then
  echo "    Application Default Credentials are configured"
else
  echo -e "    ${YELLOW}⚠️  ADC not configured. Run: gcloud auth application-default login${NC}"
fi
echo ""

# Step 8: IAM Permissions for Service-to-Service Communication
echo -e "${BLUE}8. Service-to-Service IAM Permissions${NC}"
WWW_SERVICE_NAME="slides2gif-www"
PNG2GIF_SERVICE_NAME="slides2gif-png2gif"
WWW_SERVICE_ACCOUNT="${WWW_SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if services exist (they might not be deployed yet)
WWW_SERVICE_EXISTS=$(gcloud run services describe ${WWW_SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(metadata.name)' 2>/dev/null || echo "")

PNG2GIF_SERVICE_EXISTS=$(gcloud run services describe ${PNG2GIF_SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(metadata.name)' 2>/dev/null || echo "")

if [ -n "$WWW_SERVICE_EXISTS" ] && [ -n "$PNG2GIF_SERVICE_EXISTS" ]; then
  # Check if IAM binding already exists
  if gcloud run services get-iam-policy ${PNG2GIF_SERVICE_NAME} \
    --region ${REGION} \
    --project ${PROJECT_ID} \
    --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SERVICE_ACCOUNT}"; then
    echo -e "  ${CHECK} IAM permissions already configured"
    echo "    ${WWW_SERVICE_NAME} can invoke ${PNG2GIF_SERVICE_NAME}"
  else
    if run_step "Granting ${WWW_SERVICE_NAME} permission to invoke ${PNG2GIF_SERVICE_NAME}" \
      "gcloud run services add-iam-policy-binding ${PNG2GIF_SERVICE_NAME} \
      --region ${REGION} \
      --member='serviceAccount:${WWW_SERVICE_ACCOUNT}' \
      --role='roles/run.invoker' \
      --project ${PROJECT_ID}"; then
      :
    else
      echo -e "    ${YELLOW}⚠️  Failed to set IAM permissions. Services may not be deployed yet.${NC}"
    fi
  fi
else
  echo -e "  ${YELLOW}⚠️  Services not deployed yet. IAM permissions will be set during deployment.${NC}"
  if [ -z "$WWW_SERVICE_EXISTS" ]; then
    echo "    ${WWW_SERVICE_NAME} not found"
  fi
  if [ -z "$PNG2GIF_SERVICE_EXISTS" ]; then
    echo "    ${PNG2GIF_SERVICE_NAME} not found"
  fi
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Setup Summary${NC}"
echo "  Completed: ${STEPS_COMPLETED}/${STEPS_TOTAL} checks"
echo ""

if [ ${STEPS_COMPLETED} -eq ${STEPS_TOTAL} ]; then
  echo -e "${GREEN}✅ All setup steps completed!${NC}"
else
  echo -e "${YELLOW}⚠️  Some steps need attention. Review the output above.${NC}"
fi
echo ""
echo "Next steps:"
echo "  1. If secrets are missing, create them:"
echo "     - Run './setup.sh' again (it will prompt for missing secrets)"
echo "     - Or create manually: gcloud secrets create <name> --data-file=- --project ${PROJECT_ID}"
echo "  2. For local development, ensure www/.env.local exists (gitignored)"
echo "  3. Run: just deploy (or just stage for staging)"
echo ""
echo "Note: IAM permissions for service-to-service communication will be"
echo "      automatically configured during deployment if services don't exist yet."
echo ""
