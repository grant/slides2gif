#!/bin/bash
set -e

# Verify secrets in Secret Manager. (Optional: if www/.env.local exists, compare it to GSM.)
# Usage: ./scripts/verify-secrets.sh   With no .env.local, runs verify-env.sh. Prefer: just verify-env

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
[ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "undefined" ] && PROJECT_ID="slides2gifcom"
ENV_FILE="www/.env.local"

# GSM-only: if no .env.local, just verify secrets exist in GSM (same as verify-env)
if [ ! -f "$ENV_FILE" ]; then
  echo "No www/.env.local (GSM-only). Verifying secrets exist in GSM..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  exec bash "$SCRIPT_DIR/verify-env.sh"
fi

echo "Verifying secrets in Secret Manager..."
echo ""

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
    echo "⚠️  ${secret_name}: Not set in .env.local"
    return 1
  fi

  # Get secret value from Secret Manager
  local secret_value=$(gcloud secrets versions access latest \
    --secret="${secret_name}" \
    --project="${PROJECT_ID}" 2>/dev/null || echo "")

  if [ -z "$secret_value" ]; then
    echo "✗ ${secret_name}: Not found in Secret Manager"
    return 1
  fi

  if [ "$secret_value" = "$expected_value" ]; then
    echo "✓ ${secret_name}: Matches .env.local"
    return 0
  else
    echo "⚠️  ${secret_name}: Different from .env.local"
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
