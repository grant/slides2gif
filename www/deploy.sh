#!/bin/bash

# Read env vars
set -a
[ -f .env ] && . .env
set +a

# Config
SERVICE=""
if [[ "${RUN_ENV}" == "PROD" ]]; then
  SERVICE="slides2gif"
else
  # Default to staging
  SERVICE="slides2gif-staging"
fi
echo "Deploying to project: ${SERVICE}"

# Build the app
npm run build;
if [ $? -eq 0 ]; then
  echo "BUILD SUCCESSFUL."
  # Deploys the web app to Cloud Run
  GCP_PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null);
  gcloud run deploy slides2gif \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars "OAUTH_CLIENT_ID=$OAUTH_CLIENT_ID" \
  --set-env-vars "OAUTH_CLIENT_SECRET=$OAUTH_CLIENT_SECRET" \
  --allow-unauthenticated
else
  echo "BUILD FAILED!"
fi
