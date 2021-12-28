#!/bin/bash

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

# Deploys the web app to Cloud Run
GCP_PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
gcloud run deploy slides2gif \
--source . \
--platform managed \
--region us-central1 \
--allow-unauthenticated