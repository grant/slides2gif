#!/bin/bash
# Print Cloud Run domain mapping DNS records for copying into Cloudflare.
# Usage: DOMAIN=slides2gif.grant.cm ./scripts/domain-dns-records.sh
#   DOMAIN defaults to slides2gif.com. Apex domains also list www.;
#   subdomains list the subdomain only.
set -e

PROJECT_ID="slides2gifcom"
REGION="us-central1"
BASE_DOMAIN="${DOMAIN:-slides2gif.com}"

# Apex domains also get a www. mapping; subdomains map the subdomain only.
DOMAINS=("${BASE_DOMAIN}")
if [[ "${BASE_DOMAIN}" != *.*.* ]]; then
  DOMAINS+=("www.${BASE_DOMAIN}")
fi

gcloud config set project "${PROJECT_ID}" --quiet

for domain in "${DOMAINS[@]}"; do
  echo "=== ${domain} ==="
  gcloud beta run domain-mappings describe --domain "${domain}" --region "${REGION}" --project "${PROJECT_ID}" --format="yaml(status.resourceRecords)" 2>/dev/null || echo "(no mapping yet)"
  echo ""
done

