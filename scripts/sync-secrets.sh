#!/bin/bash
set -e

# Helper script to sync secrets from .env.local to Secret Manager
# Usage: ./scripts/sync-secrets.sh

PROJECT_ID="slides2gifcom"
ENV_FILE="www/.env.local"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Syncing secrets from .env.local to Secret Manager..."
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}Error: $ENV_FILE not found${NC}"
  exit 1
fi

# Load .env.local
set -a
source "$ENV_FILE"
set +a

# Sync a secret
sync_secret() {
  local secret_name=$1
  local env_var_name=$2
  local value="${!env_var_name}"
  
  if [ -z "$value" ]; then
    echo -e "${YELLOW}⚠️  Skipping ${secret_name}: Not set in .env.local${NC}"
    return 1
  fi
  
  # Check if secret exists
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    echo -e "${BLUE}→ Updating ${secret_name}...${NC}"
    echo -n "$value" | gcloud secrets versions add "${secret_name}" \
      --data-file=- \
      --project="${PROJECT_ID}" > /dev/null 2>&1
    echo -e "${GREEN}✓ Updated${NC}"
  else
    echo -e "${BLUE}→ Creating ${secret_name}...${NC}"
    echo -n "$value" | gcloud secrets create "${secret_name}" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="${PROJECT_ID}" > /dev/null 2>&1
    echo -e "${GREEN}✓ Created${NC}"
  fi
}

sync_secret "oauth-client-id" "OAUTH_CLIENT_ID"
sync_secret "oauth-client-secret" "OAUTH_CLIENT_SECRET"
sync_secret "secret-cookie-password" "SECRET_COOKIE_PASSWORD"
sync_secret "google-cloud-project-number" "GOOGLE_CLOUD_PROJECT_NUMBER"
sync_secret "google-picker-developer-key" "GOOGLE_PICKER_DEVELOPER_KEY"

echo ""
echo -e "${GREEN}✅ All secrets synced!${NC}"
