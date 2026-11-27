#!/bin/bash
# Setup a custom domain for the www Cloud Run service (default slides2gif.com).
# Prereqs: Domain on Namecheap, NS pointed to Cloudflare (edna/stan), Cloud Run www deployed.
# Usage: DOMAIN=slides2gif.grant.cm ./setup-domain.sh [verify|map|dns|all]
#   DOMAIN defaults to slides2gif.com. Apex domains also get a www. mapping;
#   subdomains (e.g. slides2gif.grant.cm) map the subdomain only.

set -e

PROJECT_ID="slides2gifcom"
REGION="us-central1"
SERVICE_NAME="slides2gif-www"
BASE_DOMAIN="${DOMAIN:-slides2gif.com}"

# Apex domains also get a www. mapping; subdomains map the subdomain only.
DOMAINS=("${BASE_DOMAIN}")
if [[ "${BASE_DOMAIN}" != *.*.* ]]; then
  DOMAINS+=("www.${BASE_DOMAIN}")
fi

cmd="${1:-all}"

gcloud config set project "${PROJECT_ID}" --quiet

case "$cmd" in
  verify)
    echo "Verifying domain ownership with Google (opens Search Console)..."
    echo "Complete verification in Search Console (e.g. add the TXT record in Cloudflare DNS)."
    gcloud domains verify "${BASE_DOMAIN}"
    ;;
  map)
    echo "Creating Cloud Run domain mappings for ${DOMAINS[*]}..."
    for domain in "${DOMAINS[@]}"; do
      gcloud beta run domain-mappings create --service "${SERVICE_NAME}" --domain "${domain}" --region "${REGION}" --project "${PROJECT_ID}" 2>/dev/null || true
    done
    echo "✅ Domain mappings created. Run with 'dns' to show records for Cloudflare."
    ;;
  dns)
    echo "DNS records to add in Cloudflare for ${BASE_DOMAIN}:"
    echo ""
    for domain in "${DOMAINS[@]}"; do
      echo "=== ${domain} ==="
      gcloud beta run domain-mappings describe --domain "${domain}" --region "${REGION}" --project "${PROJECT_ID}" --format="yaml(status.resourceRecords)" 2>/dev/null || echo "  (run 'map' first if mapping not found)"
      echo ""
    done
    echo "Add the A/AAAA/CNAME records above in Cloudflare DNS."
    if [ "${#DOMAINS[@]}" -gt 1 ]; then
      echo "Use name @ for apex, www for www."
    fi
    ;;
  all)
    echo "Domain setup: verify → map → dns"
    echo ""
    echo "1. Verify (one-time): run with 'verify' and complete Search Console; add any TXT in Cloudflare."
    echo "2. Map: run with 'map' to create Cloud Run domain mappings."
    echo "3. DNS: run with 'dns' to print records, then add them in Cloudflare."
    echo ""
    echo "Commands: DOMAIN=<domain> $0 verify | map | dns | all  (default domain: slides2gif.com)"
    ;;
  *)
    echo "Usage: $0 verify | map | dns | all"
    exit 1
    ;;
esac

