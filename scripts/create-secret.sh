#!/bin/bash
set -e

# Helper script to create a secret in Google Cloud Secret Manager
# Usage: ./scripts/create-secret.sh <secret-name> [value]
# If value is not provided, will prompt for input

PROJECT_ID="slides2gifcom"
SECRET_NAME="$1"
SECRET_VALUE="$2"

if [ -z "$SECRET_NAME" ]; then
  echo "Usage: $0 <secret-name> [value]"
  echo ""
  echo "Available secrets:"
  echo "  - oauth-client-id"
  echo "  - oauth-client-secret"
  echo "  - secret-cookie-password"
  exit 1
fi

# Set the project
gcloud config set project ${PROJECT_ID} 2>/dev/null || true

# Check if secret already exists
if gcloud secrets describe ${SECRET_NAME} --project ${PROJECT_ID} > /dev/null 2>&1; then
  echo "Secret '${SECRET_NAME}' already exists."
  read -p "Update it? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
  UPDATE_FLAG="--update"
else
  UPDATE_FLAG=""
fi

# Get secret value
if [ -z "$SECRET_VALUE" ]; then
  echo "Enter value for ${SECRET_NAME} (will be hidden):"
  read -s SECRET_VALUE
  echo
fi

# Create or update secret
if [ -n "$UPDATE_FLAG" ]; then
  echo -n "$SECRET_VALUE" | gcloud secrets versions add ${SECRET_NAME} \
    --data-file=- \
    --project ${PROJECT_ID}
  echo "✅ Secret '${SECRET_NAME}' updated"
else
  echo -n "$SECRET_VALUE" | gcloud secrets create ${SECRET_NAME} \
    --data-file=- \
    --replication-policy="automatic" \
    --project ${PROJECT_ID}
  echo "✅ Secret '${SECRET_NAME}' created"
fi
