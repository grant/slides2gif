#!/bin/bash
GCP_PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
gcloud run deploy slides2gif-auth \
--source . \
--platform managed \
--region us-central1 \
--allow-unauthenticated