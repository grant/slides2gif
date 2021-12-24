#!/bin/bash
# Read env vars
set -a
[ -f .env ] && . .env
set +a

# Deploy
GCP_PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
gcloud run deploy slides2gif-auth \
--source . \
--platform managed \
--region us-central1 \
--set-env-vars "OAUTH_CLIENT_ID=$OAUTH_CLIENT_ID" \
--set-env-vars "OAUTH_CLIENT_SECRET=$OAUTH_CLIENT_SECRET" \
--allow-unauthenticated