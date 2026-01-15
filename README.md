# slides2gif

Create animated GIFs from Google Slides presentations.

Check it out at [slides2gif.com](https://slides2gif.com)!

## Quick Start

This project uses [Just](https://github.com/casey/just) to manage development tasks.

### Install Just

```bash
# macOS
brew install just

# Or via cargo
cargo install just
```

### Run Everything

```bash
just
# or
just dev
```

This will start:
- **www service** on `http://localhost:3000` (Next.js)
- **png2gif service** on `http://localhost:3001` (Express)

## Available Commands

### Development
- `just` or `just dev` - Run both services in parallel
- `just dev-www` - Run only the www service
- `just dev-png2gif` - Run only the png2gif service

### Installation
- `just install-all` - Install dependencies for all services
- `just install-www` - Install dependencies for www service
- `just install-png2gif` - Install dependencies for png2gif service

### Building
- `just build-all` - Build all services
- `just build-www` - Build www service
- `just build-png2gif` - Build png2gif service

### Linting
- `just lint-all` - Lint all services
- `just lint-www` - Lint www service
- `just lint-png2gif` - Lint png2gif service

### Cleanup
- `just clean` - Remove build artifacts

## Architecture

The project consists of two main services:

### www (Next.js)
- Frontend web application
- API routes for Google Slides integration
- Runs on port `3000` (default)

### png2gif (Express)
- Converts PNG images to animated GIFs
- Runs on port `3001` (configurable via `PORT` env var)

## Authentication

### Local Development
- **No authentication required** - Both services run without auth in local development
- The png2gif service skips authentication when `NODE_ENV !== 'production'` or `GOOGLE_CLOUD_PROJECT` is not set

### Cloud Run (Production)
- **Service-to-service authentication** - The www service uses Google Auth Library to get ID tokens
- The png2gif service verifies the `Authorization: Bearer <token>` header
- Set `PNG2GIF_SERVICE_URL` environment variable to the Cloud Run service URL

## Environment Variables

### Local Development
No environment variables required for basic operation.

### Cloud Run
- `PNG2GIF_SERVICE_URL` - URL of the png2gif Cloud Run service
- `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID (automatically set in Cloud Run)
- `GCS_CACHE_BUCKET` - Google Cloud Storage bucket name for caching

## Technologies

- **Frontend**
  - Next.js / React
  - Tailwind CSS
  - Material Icons
- **Backend**
  - Cloud Run
  - Docker
  - Node.js
- **APIs**
  - Google Slides API
  - Google Sign-in API
  - Google Cloud Storage

## Service Limitations

Using the Google Slides API to create thumbnails is expensive and has limits.

See [limits](https://developers.google.com/slides/limits):
- 500 per project per 100 seconds
- 100 per user per 100 seconds

## Setup Script

```sh
gcloud config set project "my-project"
PROJECT=$(gcloud config get-value core/project 2> /dev/null)

# Enable APIs
gcloud services enable slides.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com

# Create a service account for accessing Google Cloud Storage
# See: https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating_service_account_keys
gcloud iam service-accounts create slides2gif-service-account
gcloud iam service-accounts keys create creds.json \
  --iam-account slides2gif-service-account@${PROJECT}.iam.gserviceaccount.com
export GOOGLE_APPLICATION_CREDENTIALS="creds.json"

# Grant necessary permissions
gcloud projects add-iam-policy-binding ${PROJECT} \
  --member="serviceAccount:slides2gif-service-account@${PROJECT}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create a bucket for caching slide images
gsutil mb gs://slides2gif-cache
gsutil iam ch allUsers:objectViewer gs://slides2gif-cache

# Create a bucket for uploaded GIFs
gsutil mb gs://slides2gif-upload-test
gsutil iam ch allUsers:objectViewer gs://slides2gif-upload-test

# Login with ADC
gcloud auth application-default login
```

### Create Cookie Secret

Create `www/.env.local`:

```sh
# ⚠️ The SECRET_COOKIE_PASSWORD should never be inside your repository directly
# For local development, store it inside a `.env.local` gitignored file
# See https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables

SECRET_COOKIE_PASSWORD=my-secretmy-secretmy-secretmy-secretmy-secretmy-secretmy-secretmy-secretmy-secretmy-secret
```

OAuth: https://console.cloud.google.com/apis/credentials
