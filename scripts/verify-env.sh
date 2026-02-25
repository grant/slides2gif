#!/usr/bin/env bash
# Verify required secrets exist in Google Secret Manager (for local dev and deploy).
# Usage: ./scripts/verify-env.sh   or   just verify-env
# Exit 0 if all present and readable, 1 otherwise.

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "undefined" ]; then
  PROJECT_ID="slides2gifcom"
fi

REQUIRED=(secret-cookie-password oauth-client-id oauth-client-secret)

echo "Verifying secrets in Google Secret Manager (project: $PROJECT_ID)"
echo ""

missing=0
for name in "${REQUIRED[@]}"; do
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    if val=$(gcloud secrets versions access latest --secret="$name" --project="$PROJECT_ID" 2>/dev/null); then
      if [ -n "$val" ]; then
        echo "✓ $name"
      else
        echo "✗ $name (empty value)"
        missing=1
      fi
    else
      echo "✗ $name (no access or no version)"
      missing=1
    fi
  else
    echo "✗ $name (not found in GSM)"
    missing=1
  fi
done

echo ""
if [ $missing -eq 0 ]; then
  echo "✅ All required secrets present. Run: just dev"
  exit 0
else
  echo "Create missing secrets: ./scripts/create-secret.sh <secret-name>  (e.g. secret-cookie-password, oauth-client-id, oauth-client-secret)"
  exit 1
fi
