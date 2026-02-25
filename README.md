# slides2gif

[![Lint](https://github.com/grant/slides2gif/actions/workflows/lint.yml/badge.svg)](https://github.com/grant/slides2gif/actions/workflows/lint.yml)
[![Build](https://github.com/grant/slides2gif/actions/workflows/build.yml/badge.svg)](https://github.com/grant/slides2gif/actions/workflows/build.yml)
[![Docker](https://github.com/grant/slides2gif/actions/workflows/docker.yml/badge.svg)](https://github.com/grant/slides2gif/actions/workflows/docker.yml)

Create animated GIFs from Google Slides presentations.

Check it out at [slides2gif.com](https://slides2gif.com)!

## Commands

Requires [Just](https://github.com/casey/just): `brew install just` or `cargo install just`.

- **`just setup`** — Configure Google Cloud (auth, APIs, buckets). Run once.
- **`just verify-env`** — Check required secrets exist in GSM. Run before `just dev`.
- **`just install`** — Install dependencies for www and png2gif.
- **`just dev`** — Run www + png2gif (secrets from GSM).
- **`just build`** — Build www and png2gif.
- **`just lint`** — Lint www and png2gif.

Each of `dev`, `install`, `build`, and `lint` has a `-www` or `-png2gif` variant (e.g. `just dev-www`). Also: `just ci` (full CI locally), `just clean` (remove build artifacts).

Secrets live in Google Secret Manager (no local .env). First time: `just create-secret <name>` for `secret-cookie-password`, `oauth-client-id`, `oauth-client-secret` — you’ll be prompted for values. OAuth credentials: [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID (web app).

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

Configure your Google Cloud project:

```bash
just setup
```

This checks and configures authentication, project, APIs, buckets, service account, and Application Default Credentials. Run it multiple times; it's idempotent.

### Deploy Services

After setup, deploy both services so they can connect on Cloud Run:

```bash
just deploy
```

This will:
1. **Deploy `png2gif`** first (Cloud Run service that converts slides to GIF).
2. **Deploy `www`** with `PNG2GIF_SERVICE_URL` set to the png2gif URL (so the "Create GIF" flow works).
3. **Resolve the www service account** (custom SA or default compute) and grant it **Cloud Run Invoker** on the png2gif service so www can call png2gif with an ID token.
4. Verify secret access for www.

**Order matters:** png2gif must be deployed before www so the deploy can discover its URL. Use `just deploy` to do both in one go.

### Secret Management

Secrets live in Google Secret Manager (local dev and production). No `.env` is needed once secrets are in GSM.

**Required secrets (must exist in GSM):** `secret-cookie-password`, `oauth-client-id`, `oauth-client-secret`. **Verify:** `just verify-env`. **First-time:** `just create-secret <name>` for each; you’ll be prompted for values. OAuth: [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID (web application).

### Individual Service Deployment

To deploy services separately:

```bash
just deploy-png2gif
just setup-iam
just deploy-www
```

Deploying www without png2gif first will leave `PNG2GIF_SERVICE_URL` unset until you run `just deploy` or redeploy www after png2gif exists.
