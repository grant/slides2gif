#!/bin/bash
set -e

# Helper script to sync secrets from .env.local to Secret Manager
# Usage: ./scripts/sync-secrets.sh

PROJECT_ID="slides2gifcom"
ENV_FILE="www/.env.local"

echo "Syncing secrets from .env.local to Secret Manager..."
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  Error: $ENV_FILE not found"
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
    echo "⚠️  Skipping ${secret_name}: Not set in .env.local"
    return 1
  fi

  # Check if secret exists
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    echo "→ Updating ${secret_name}..."
    echo -n "$value" | gcloud secrets versions add "${secret_name}" \
      --data-file=- \
      --project="${PROJECT_ID}" > /dev/null 2>&1
    echo "✓ Updated"
  else
    echo "→ Creating ${secret_name}..."
    echo -n "$value" | gcloud secrets create "${secret_name}" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="${PROJECT_ID}" > /dev/null 2>&1
    echo "✓ Created"
  fi
}

sync_secret "oauth-client-id" "OAUTH_CLIENT_ID"
sync_secret "oauth-client-secret" "OAUTH_CLIENT_SECRET"
sync_secret "secret-cookie-password" "SECRET_COOKIE_PASSWORD"
sync_secret "google-cloud-project-number" "GOOGLE_CLOUD_PROJECT_NUMBER"
sync_secret "google-picker-developer-key" "GOOGLE_PICKER_DEVELOPER_KEY"

echo ""
echo "✅ All secrets synced!"
