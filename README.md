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

### Local Development (Required)

Create `www/.env.local` with the following variables:

- `SECRET_COOKIE_PASSWORD` - Secret key for encrypting session cookies (32+ characters)
- `OAUTH_CLIENT_ID` - Google OAuth 2.0 Client ID
- `OAUTH_CLIENT_SECRET` - Google OAuth 2.0 Client Secret
- `GCS_CACHE_BUCKET` - Google Cloud Storage bucket name for caching slide thumbnails (defaults to `slides2gif-cache` if not set)

**Optional:**
- `PNG2GIF_SERVICE_URL` - URL of the png2gif service (defaults to `http://localhost:3001`)

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

After setup, deploy both services:

```bash
./deploy.sh
```

This will:
1. Deploy `png2gif` service
2. Deploy `www` service (auto-discovers png2gif URL)
3. Configure IAM permissions for service-to-service communication

### Secret Management

**Production (Cloud Run):** Secrets are stored in Google Cloud Secret Manager.

**Local Development:** Create `www/.env.local` (gitignored) with:

```bash
# Session encryption key (32+ characters)
SECRET_COOKIE_PASSWORD=your-32-plus-character-secret

# Google OAuth 2.0 credentials
OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
OAUTH_CLIENT_SECRET=your-client-secret

# Google Cloud Storage bucket
GCS_CACHE_BUCKET=slides2gif-cache
```

**Setting up secrets for production:**

1. Run `./setup.sh` - it will create secrets from your `www/.env.local` if available
2. Or create secrets manually:
   ```bash
   # Create a secret
   echo -n "your-secret-value" | gcloud secrets create oauth-client-id \
     --data-file=- \
     --replication-policy="automatic" \
     --project slides2gifcom
   
   # Or use the helper script
   ./scripts/create-secret.sh oauth-client-id
   ```

**Required secrets:**
- `oauth-client-id` - OAuth Client ID
- `oauth-client-secret` - OAuth Client Secret  
- `secret-cookie-password` - Session cookie encryption key (32+ chars)

**Get OAuth Credentials:** https://console.cloud.google.com/apis/credentials

### Individual Service Deployment

```bash
# Deploy png2gif only
cd png2gif && ./deploy.sh

# Deploy www only
cd www && ./deploy.sh
```
