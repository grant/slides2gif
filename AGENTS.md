# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

slides2gif is a monorepo with two services that create animated GIFs from Google Slides:

| Service | Port | Description |
|---------|------|-------------|
| **www** | 3000 | Next.js 15 (App Router) frontend + API |
| **png2gif** | 3001 | Express.js microservice for PNG→GIF conversion |

### Prerequisites (already installed in VM snapshot)

- **Node.js 24** (per `.nvmrc`); activate via `source ~/.nvm/nvm.sh && nvm use 24`
- **just** command runner (see `Justfile` for all tasks)
- Native image libraries for `canvas` npm package: `libcairo2-dev`, `libpango1.0-dev`, `libjpeg-dev`, `libgif-dev`, `librsvg2-dev`, `pkg-config`
- `ffmpeg` and `graphicsmagick` for image processing in png2gif

### Common commands

See `README.md` and `Justfile` for the full list. Key commands:

- `just dev` — start both services in parallel (www on :3000, png2gif on :3001)
- `just lint` — lint both services (prettier + eslint)
- `just build-all` — build both services
- `just install-all` — install npm deps for both services

### Gotchas

- **Do not run `just build-www` while the dev server is running.** The production build writes to `.next/` and corrupts the dev server's cache, causing 500 errors. If this happens, stop the dev server, run `rm -rf www/.next`, and restart with `npm run dev` from `www/`.
- The `openapi:types` build step generates `www/lib/api/generated/openapi.d.ts` which is not git-tracked. After generation, run `npx prettier --write --single-quote www/lib/api/generated/openapi.d.ts` to pass lint.
- **No authentication needed for local dev.** Both services skip auth when `NODE_ENV !== 'production'`. The `www/.env.local` file needs placeholder values for `SECRET_COOKIE_PASSWORD`, `OAUTH_CLIENT_ID`, and `OAUTH_CLIENT_SECRET` (any dummy values work for dev).
- The `png2gif` service health check is at `GET /health` (not `/`).
- The `www` service API status check is at `GET /api/status`.
