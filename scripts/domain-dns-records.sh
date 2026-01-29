#!/bin/bash
# Print Cloud Run domain mapping DNS records for copying into Cloudflare.
set -e

PROJECT_ID="slides2gifcom"
REGION="us-central1"
BASE_DOMAIN="slides2gif.com"

gcloud config set project "${PROJECT_ID}" --quiet

for domain in "${BASE_DOMAIN}" "www.${BASE_DOMAIN}"; do
  echo "=== ${domain} ==="
  gcloud beta run domain-mappings describe --domain "${domain}" --region "${REGION}" --project "${PROJECT_ID}" --format="yaml(status.resourceRecords)" 2>/dev/null || echo "(no mapping yet)"
  echo ""
done
