# slides2gif

[![Lint](https://github.com/grant/slides2gif/actions/workflows/lint.yml/badge.svg)](https://github.com/grant/slides2gif/actions/workflows/lint.yml)
[![Build](https://github.com/grant/slides2gif/actions/workflows/build.yml/badge.svg)](https://github.com/grant/slides2gif/actions/workflows/build.yml)
[![Docker](https://github.com/grant/slides2gif/actions/workflows/docker.yml/badge.svg)](https://github.com/grant/slides2gif/actions/workflows/docker.yml)

Create animated GIFs from Google Slides presentations.

Check it out at [slides2gif.com](https://slides2gif.com)!

## Setup to run the app

This project uses [Just](https://github.com/casey/just). One-time setup:

| Step | Command | What it does |
|------|---------|--------------|
| 1 | Install Just | `brew install just` (macOS) or `cargo install just` |
| 2 | `just install` | Install npm dependencies for www and png2gif |
| 3 | `just setup` | Configure Google Cloud (auth, project, APIs, buckets). Run `gcloud auth login` first if needed. |
| 4 | Create secrets (first-time only) | `just create-secret secret-cookie-password`, `just create-secret oauth-client-id`, `just create-secret oauth-client-secret`. You’ll be prompted for values. OAuth: [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID (web app). |
| 5 | `just verify-env` | Check that required secrets exist in Google Secret Manager |
| 6 | `just dev` | Load secrets from GSM and start www (port 3000) + png2gif (port 3001) |

Secrets are **always** loaded from Google Secret Manager (no local .env). `just dev` uses `with-secrets.sh` to fetch them via `gcloud` before starting the app.

## Available Commands

### Setup and run
- `just setup` - Configure Google Cloud project (auth, APIs, buckets). Run once.
- `just verify-env` - Verify required secrets exist in GSM. Run before `just dev`.
- `just dev` - Run www + png2gif (secrets loaded from GSM).

### Development
- `just` or `just dev` - Run both services in parallel
- `just dev-www` - Run only the www service
- `just dev-png2gif` - Run only the png2gif service

### Installation
- `just install` - Install dependencies for www and png2gif
- `just verify-env` - Verify required secrets exist in Google Secret Manager (run before `just dev` or deploy)
- `just install-www` - Install dependencies for www only
- `just install-png2gif` - Install dependencies for png2gif only

### Building
- `just build` - Build www and png2gif
- `just build-www` - Build www only
- `just build-png2gif` - Build png2gif only

### Linting
- `just lint` - Lint all services
- `just lint-www` - Lint www service
- `just lint-png2gif` - Lint png2gif service

### CI (local)
- `just ci` - Run full CI locally (lint + build + Docker build)

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

All secrets are loaded from **Google Secret Manager** at server start. Required (must exist in GSM):

- `SECRET_COOKIE_PASSWORD` – session cookies (32+ chars)
- `OAUTH_CLIENT_ID` – Google OAuth 2.0 Client ID
- `OAUTH_CLIENT_SECRET` – Google OAuth 2.0 Client Secret

**Optional / non-secret:** `GCS_CACHE_BUCKET` (defaults to `slides2gif-cache`), `PNG2GIF_SERVICE_URL` (defaults to `http://localhost:3001`). For Drive Picker: `GOOGLE_CLOUD_PROJECT_NUMBER`, `GOOGLE_PICKER_DEVELOPER_KEY` (can be in GSM or env).

### Cloud Run (Production)

**Required:**
- `SECRET_COOKIE_PASSWORD` - Secret key for encrypting session cookies
- `OAUTH_CLIENT_ID_PROD` - Google OAuth 2.0 Client ID (production)
- `OAUTH_CLIENT_SECRET_PROD` - Google OAuth 2.0 Client Secret (production)
- `GCS_CACHE_BUCKET` - Google Cloud Storage bucket name for caching

**Note:** You can use `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` as fallback if you prefer a single client for both environments.

**Optional:**
- `PNG2GIF_SERVICE_URL` - URL of the png2gif Cloud Run service
- `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID (automatically set in Cloud Run)

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

## Deployment

### Initial Setup

Run the setup script to configure your Google Cloud project:

```bash
./setup.sh
```

This will check and configure:
- ✓ Authentication
- ✓ Project configuration
- ✓ Required APIs
- ✓ Cloud Storage buckets
- ✓ Service account and permissions
- ✓ Environment variables
- ✓ Application Default Credentials

You can run `./setup.sh` multiple times - it's idempotent and will show what's already done vs what needs to be configured.

### Deploy Services

After setup, deploy **both** services so they can connect on Cloud Run:

```bash
just deploy
# or
./deploy.sh
```

This will:
1. **Deploy `png2gif`** first (Cloud Run service that converts slides to GIF).
2. **Deploy `www`** with `PNG2GIF_SERVICE_URL` set to the png2gif URL (so the "Create GIF" flow works).
3. **Resolve the www service account** (custom SA or default compute) and grant it **Cloud Run Invoker** on the png2gif service so www can call png2gif with an ID token.
4. Verify secret access for www.

**Order matters:** png2gif must be deployed before www so the deploy script can discover its URL and pass it to www. Use `just deploy` (root) to do both in one go.

### Secret Management

**We always use Google Secret Manager** for secrets (local dev and production). No `.env` is needed to run the app once secrets are in GSM.

**Required secrets (must exist in GSM):**
- `secret-cookie-password` – Session cookie encryption key (32+ chars)
- `oauth-client-id` – Google OAuth 2.0 Client ID
- `oauth-client-secret` – Google OAuth 2.0 Client Secret

**Verify:** `just verify-env` checks that all required secrets exist and are readable.

**First-time setup:** Run `./setup.sh`, then `./scripts/create-secret.sh <name>` for each of `secret-cookie-password`, `oauth-client-id`, `oauth-client-secret`. OAuth values: [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID (web application).

### Individual Service Deployment

If you deploy services separately:

```bash
# 1. Deploy png2gif first
just deploy-png2gif

# 2. Grant www permission to invoke png2gif (if not already done)
./setup-iam.sh

# 3. Deploy www (deploy.sh will discover PNG2GIF_SERVICE_URL from step 1)
just deploy-www
```

Deploying www alone without png2gif deployed will leave `PNG2GIF_SERVICE_URL` unset and "Create GIF" will fail until you redeploy www after png2gif exists.
