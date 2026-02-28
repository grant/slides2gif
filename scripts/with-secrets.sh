#!/usr/bin/env bash
# Load required secrets from Google Secret Manager and run the given command with them in env.
# Usage: ./scripts/with-secrets.sh -- just dev   or   ./scripts/with-secrets.sh -- cd www && npm run dev
# Uses gcloud (no Node SDK) so Next.js never bundles Secret Manager.

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "undefined" ]; then
  PROJECT_ID="slides2gifcom"
fi

get_secret() {
  gcloud secrets versions access latest --secret="$1" --project="$PROJECT_ID" 2>/dev/null
}

# Load required secrets; fail if any missing
SECRET_COOKIE_PASSWORD=$(get_secret "secret-cookie-password") || { echo "Error: secret-cookie-password not found or no access. Run: just verify-env"; exit 1; }
OAUTH_CLIENT_ID=$(get_secret "oauth-client-id") || { echo "Error: oauth-client-id not found or no access. Run: just verify-env"; exit 1; }
OAUTH_CLIENT_SECRET=$(get_secret "oauth-client-secret") || { echo "Error: oauth-client-secret not found or no access. Run: just verify-env"; exit 1; }
GOOGLE_CLOUD_PROJECT_NUMBER=$(get_secret "google-cloud-project-number") || true
GOOGLE_PICKER_DEVELOPER_KEY=$(get_secret "google-picker-developer-key") || true

[ -n "$SECRET_COOKIE_PASSWORD" ] && [ ${#SECRET_COOKIE_PASSWORD} -ge 32 ] || { echo "Error: secret-cookie-password must be 32+ chars"; exit 1; }

# Fail before starting dev if any required env var is missing (fail fast with clear message)
REQUIRED_VARS="SECRET_COOKIE_PASSWORD OAUTH_CLIENT_ID OAUTH_CLIENT_SECRET GOOGLE_CLOUD_PROJECT_NUMBER GOOGLE_PICKER_DEVELOPER_KEY"
MISSING=""
for var in $REQUIRED_VARS; do
  eval "val=\${$var}"
  [ -n "$val" ] || MISSING="${MISSING}${MISSING:+ }$var"
done
if [ -n "$MISSING" ]; then
  echo "Error: Missing required env (from GSM): $MISSING"
  echo "Run: just verify-env   then create any missing secrets: just create-secret <name>"
  echo "Picker needs: google-cloud-project-number, google-picker-developer-key"
  exit 1
fi

export SECRET_COOKIE_PASSWORD OAUTH_CLIENT_ID OAUTH_CLIENT_SECRET
export GOOGLE_CLOUD_PROJECT_NUMBER GOOGLE_PICKER_DEVELOPER_KEY
export GOOGLE_CLOUD_PROJECT="${PROJECT_ID}"

# Run the rest of the command line (after --, or the whole line)
if [ "$1" = "--" ]; then
  shift
fi
exec "$@"
