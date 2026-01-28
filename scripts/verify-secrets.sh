#!/bin/bash
set -e

# Helper script to verify secrets in Secret Manager match your .env.local
# Usage: ./scripts/verify-secrets.sh

PROJECT_ID="slides2gifcom"
ENV_FILE="www/.env.local"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Verifying secrets in Secret Manager..."
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error: $ENV_FILE not found${NC}"
  exit 1
fi

# Load .env.local
set -a
source "$ENV_FILE"
set +a

# Check each secret
check_secret() {
  local secret_name=$1
  local env_var_name=$2
  local expected_value="${!env_var_name}"
  
  if [ -z "$expected_value" ]; then
    echo -e "${YELLOW}⚠️  ${secret_name}: Not set in .env.local${NC}"
    return 1
  fi
  
  # Get secret value from Secret Manager
  local secret_value=$(gcloud secrets versions access latest \
    --secret="${secret_name}" \
    --project="${PROJECT_ID}" 2>/dev/null || echo "")
  
  if [ -z "$secret_value" ]; then
    echo -e "${RED}✗ ${secret_name}: Not found in Secret Manager${NC}"
    return 1
  fi
  
  if [ "$secret_value" = "$expected_value" ]; then
    echo -e "${GREEN}✓ ${secret_name}: Matches .env.local${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  ${secret_name}: Different from .env.local${NC}"
    echo "   Secret Manager: ${secret_value:0:20}..."
    echo "   .env.local:     ${expected_value:0:20}..."
    return 1
  fi
}

check_secret "oauth-client-id" "OAUTH_CLIENT_ID"
check_secret "oauth-client-secret" "OAUTH_CLIENT_SECRET"
check_secret "secret-cookie-password" "SECRET_COOKIE_PASSWORD"

echo ""
echo "Done!"
