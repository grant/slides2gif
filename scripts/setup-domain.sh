#!/bin/bash
# Setup custom domain slides2gif.com for the www Cloud Run service.
# Prereqs: Domain on Namecheap, NS pointed to Cloudflare (edna/stan), Cloud Run www deployed.
# Usage: ./setup-domain.sh [verify|map|dns|all]

set -e

PROJECT_ID="slides2gifcom"
REGION="us-central1"
SERVICE_NAME="slides2gif-www"
BASE_DOMAIN="slides2gif.com"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cmd="${1:-all}"

gcloud config set project "${PROJECT_ID}" --quiet

case "$cmd" in
  verify)
    echo -e "${BLUE}Verifying domain ownership with Google (opens Search Console)...${NC}"
    echo "Complete verification in Search Console (e.g. add the TXT record in Cloudflare DNS)."
    gcloud domains verify "${BASE_DOMAIN}"
    ;;
  map)
    echo -e "${BLUE}Creating Cloud Run domain mappings for ${BASE_DOMAIN} and www.${BASE_DOMAIN}...${NC}"
    gcloud beta run domain-mappings create --service "${SERVICE_NAME}" --domain "${BASE_DOMAIN}" --region "${REGION}" --project "${PROJECT_ID}" 2>/dev/null || true
    gcloud beta run domain-mappings create --service "${SERVICE_NAME}" --domain "www.${BASE_DOMAIN}" --region "${REGION}" --project "${PROJECT_ID}" 2>/dev/null || true
    echo -e "${GREEN}Domain mappings created. Run with 'dns' to show records for Cloudflare.${NC}"
    ;;
  dns)
    echo -e "${BLUE}DNS records to add in Cloudflare for ${BASE_DOMAIN}:${NC}"
    echo ""
    for domain in "${BASE_DOMAIN}" "www.${BASE_DOMAIN}"; do
      echo -e "${YELLOW}=== ${domain} ===${NC}"
      gcloud beta run domain-mappings describe --domain "${domain}" --region "${REGION}" --project "${PROJECT_ID}" --format="yaml(status.resourceRecords)" 2>/dev/null || echo "  (run 'map' first if mapping not found)"
      echo ""
    done
    echo -e "${BLUE}Add the A/AAAA/CNAME records above in Cloudflare DNS. Use name @ for apex, www for www.${NC}"
    ;;
  all)
    echo -e "${BLUE}Domain setup: verify -> map -> dns${NC}"
    echo ""
    echo "1. Verify (one-time): run with 'verify' and complete Search Console; add any TXT in Cloudflare."
    echo "2. Map: run with 'map' to create Cloud Run domain mappings."
    echo "3. DNS: run with 'dns' to print records, then add them in Cloudflare."
    echo ""
    echo "Commands: $0 verify | map | dns | all"
    ;;
  *)
    echo "Usage: $0 verify | map | dns | all"
    exit 1
    ;;
esac
