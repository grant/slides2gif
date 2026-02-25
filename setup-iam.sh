#!/bin/bash
set -e

# Configuration
PROJECT_ID="slides2gifcom"
REGION="us-central1"
WWW_SERVICE_NAME="slides2gif-www"
PNG2GIF_SERVICE_NAME="slides2gif-png2gif"

echo "Setting up IAM permissions for service-to-service communication"
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
    echo "www service not found; using default compute SA: ${WWW_SERVICE_ACCOUNT}"
  else
    WWW_SERVICE_ACCOUNT="${WWW_SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
  fi
fi

echo "Granting ${WWW_SERVICE_ACCOUNT} permission to invoke ${PNG2GIF_SERVICE_NAME}..."

# Grant the www service permission to invoke the png2gif service
gcloud run services add-iam-policy-binding ${PNG2GIF_SERVICE_NAME} \
  --region ${REGION} \
  --member="serviceAccount:${WWW_SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --project ${PROJECT_ID}

# Resolve the service account png2gif runs as (default compute SA if not overridden)
PNG2GIF_SERVICE_ACCOUNT=$(gcloud run services describe ${PNG2GIF_SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo "")
if [ -z "$PNG2GIF_SERVICE_ACCOUNT" ]; then
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format 'value(projectNumber)' 2>/dev/null || echo "")
  if [ -n "$PROJECT_NUMBER" ]; then
    PNG2GIF_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    echo "png2gif uses default compute SA: ${PNG2GIF_SERVICE_ACCOUNT}"
  fi
fi

GCS_CACHE_BUCKET="${GCS_CACHE_BUCKET:-slides2gif-cache}"
if [ -n "$PNG2GIF_SERVICE_ACCOUNT" ]; then
  echo ""
  echo "Granting ${PNG2GIF_SERVICE_ACCOUNT} permission to create/read objects in gs://${GCS_CACHE_BUCKET}..."
  gsutil iam ch "serviceAccount:${PNG2GIF_SERVICE_ACCOUNT}:objectAdmin" "gs://${GCS_CACHE_BUCKET}"
  echo "  ✓ Storage permissions on ${GCS_CACHE_BUCKET} configured"
fi

echo ""
echo "✅ IAM permissions configured!"
echo ""
echo "The ${WWW_SERVICE_NAME} service can now invoke ${PNG2GIF_SERVICE_NAME}."
echo "The ${PNG2GIF_SERVICE_NAME} service can create/read objects in gs://${GCS_CACHE_BUCKET}."
