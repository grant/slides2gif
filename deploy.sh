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

CHECK="✓"
CROSS="✗"
ARROW="→"

echo "Deploying slides2gif services to Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Environment: ${DEPLOY_ENV}"
echo "Services: ${WWW_SERVICE_NAME}, ${PNG2GIF_SERVICE_NAME}"
echo ""

# Set the project
gcloud config set project ${PROJECT_ID} 2>/dev/null || true

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "${CROSS} Not authenticated. Please run: gcloud auth login"
  exit 1
fi

# Check if secrets exist in Secret Manager
echo "${ARROW} Checking secrets in Secret Manager..."
SECRETS_EXIST=true
MISSING_SECRETS=()

for secret_name in "oauth-client-id" "oauth-client-secret" "secret-cookie-password"; do
  if ! gcloud secrets describe ${secret_name} --project ${PROJECT_ID} > /dev/null 2>&1; then
    SECRETS_EXIST=false
    MISSING_SECRETS+=("${secret_name}")
  fi
done

if [ "$SECRETS_EXIST" = false ]; then
  echo "${CROSS} Missing secrets in Secret Manager:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "  - ${secret}"
  done
  echo ""
  echo "Run './setup.sh' to create secrets, or create them manually:"
  echo "  gcloud secrets create <secret-name> --data-file=- --project ${PROJECT_ID}"
  exit 1
fi

echo "${CHECK} All required secrets found in Secret Manager"

# Set GCS_CACHE_BUCKET (not a secret, just config)
if [ -z "$GCS_CACHE_BUCKET" ]; then
  GCS_CACHE_BUCKET="slides2gif-cache"
fi

echo ""
echo "----------------------------------------"
echo "Deployment Checklist"
echo ""

echo "1. Deploying png2gif service..."
cd png2gif

echo "  ${ARROW} Building and deploying..."
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
  
  echo "  ${CHECK} png2gif service deployed: ${PNG2GIF_URL}"
else
  echo "  ${CROSS} Failed to deploy png2gif service"
  exit 1
fi

cd ..

echo ""
echo "2. Deploying www service..."
cd www

echo "  ${ARROW} Building Next.js app..."
if npm run build; then
  echo "  ${CHECK} Build successful"
else
  echo "  ${CROSS} Build failed"
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

echo "  ${ARROW} Deploying to Cloud Run..."
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
  
  echo "  ${CHECK} www service deployed: ${WWW_URL}"
else
  echo "  ${CROSS} Failed to deploy www service"
  exit 1
fi

cd ..

echo ""
echo "3. Resolving www service account..."
# Use the identity that actually runs the www service (from Cloud Run), not a guessed name.
WWW_SERVICE_ACCOUNT=$(gcloud run services describe ${WWW_SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")
if [ -z "$WWW_SERVICE_ACCOUNT" ]; then
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)' 2>/dev/null || echo "")
  if [ -n "$PROJECT_NUMBER" ]; then
    WWW_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  fi
fi
if [ -z "$WWW_SERVICE_ACCOUNT" ]; then
  echo "  ⚠️  Could not resolve www service account. Skipping secret and IAM steps."
  echo "    Run ./setup.sh after first deploy to grant secret access and png2gif invoker."
else
  echo "  ${CHECK} www runs as: ${WWW_SERVICE_ACCOUNT}"

  echo ""
  echo "4. Verifying secret access..."
  for secret_name in "oauth-client-id" "oauth-client-secret" "secret-cookie-password" "google-cloud-project-number" "google-picker-developer-key"; do
    if ! gcloud secrets describe ${secret_name} --project ${PROJECT_ID} > /dev/null 2>&1; then
      continue
    fi
    if gcloud secrets get-iam-policy ${secret_name} \
      --project ${PROJECT_ID} \
      --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SERVICE_ACCOUNT}"; then
      echo "  ${CHECK} ${WWW_SERVICE_ACCOUNT} has access to ${secret_name}"
    else
      echo "  ${ARROW} Granting ${WWW_SERVICE_ACCOUNT} access to ${secret_name}..."
      if gcloud secrets add-iam-policy-binding ${secret_name} \
        --member="serviceAccount:${WWW_SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project ${PROJECT_ID} \
        --quiet 2>/dev/null; then
        echo "    ${CHECK} Access granted"
      else
        echo "    ⚠️  Could not grant access"
      fi
    fi
  done

  echo ""
  echo "5. Setting up IAM permissions..."
  echo "  ${ARROW} Granting www service permission to invoke png2gif..."

  if gcloud run services add-iam-policy-binding ${PNG2GIF_SERVICE_NAME} \
    --region ${REGION} \
    --member="serviceAccount:${WWW_SERVICE_ACCOUNT}" \
    --role="roles/run.invoker" \
    --project ${PROJECT_ID} \
    --quiet 2>/dev/null; then
    echo "  ${CHECK} IAM permissions configured"
  else
    if gcloud run services get-iam-policy ${PNG2GIF_SERVICE_NAME} \
      --region ${REGION} \
      --project ${PROJECT_ID} \
      --format='value(bindings[].members)' 2>/dev/null | grep -q "${WWW_SERVICE_ACCOUNT}"; then
      echo "  ${CHECK} IAM permissions already configured"
    else
      echo "  ⚠️  Failed to set IAM permissions"
      echo "    Run: gcloud run services add-iam-policy-binding ${PNG2GIF_SERVICE_NAME} --region ${REGION} --member=serviceAccount:${WWW_SERVICE_ACCOUNT} --role=roles/run.invoker --project ${PROJECT_ID}"
    fi
  fi
fi

echo ""
echo "----------------------------------------"
echo "✅ Deployment complete!"
echo ""
echo "Services deployed:"
echo "  www:     ${WWW_URL}"
echo "  png2gif: ${PNG2GIF_URL}"
echo ""
