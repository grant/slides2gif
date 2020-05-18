#!/bin/bash
GCP_PROJECT=$(gcloud config list --format 'value(core.project)' 2>/dev/null)
gcloud config set run/region us-central1
gcloud builds submit --tag gcr.io/$GCP_PROJECT/slides2gif
gcloud run deploy slides2gif --image gcr.io/$GCP_PROJECT/slides2gif --platform managed --allow-unauthenticated