# www

The frontend in Next.js.

## Features

Features shown on the site:

- Browse Google Slide Decks
- Create GIF
    - Select slide deck
    - Customize delay, number of slides, gif size
    - Download GIF
- Hosted on Cloud Run

## Routes

### Web

GET /
GET /login
GET /gifs
GET /gifs/create
GET /presentations/import

### API

```
GET  /api/health   (health check; /api/status is an alias)
GET  /api/stats
GET  /api/gifs (list via stats)
GET  /api/presentations
GET  /api/presentations/[fileId]/...
GET  /api/gifs/download?url=...
POST /api/gifs
DELETE /api/gifs
POST /api/oauth2
POST /api/oauth2callback
```

**Typed API** (`lib/api/`):

- Single source: `definition.ts` (PATHS + routes) → Zodios client + OpenAPI spec.
- Schemas in `schemas.ts`; backend validates with same schemas.
- In app: `api.get(PATHS.stats)`, `api.post(PATHS.gifs, body)`, `deleteGif(body)` from `lib/api/client`.
- `npm run openapi` → writes `openapi.json` (commit it). `npm run openapi:types` → regenerates types. CI `openapi-check` fails if spec is stale.

## Icons

This site uses Material Design icons distributed through Google Fonts.

- https://developers.google.com/fonts/docs/material_icons
- https://fonts.google.com/icons

## DNS

- **Host:** Cloud Run w/ Custom Domains
- **CDN:** Cloudflare CDN
- **Registrar:** Namecheap

This website is hosted on Cloud Run, Cloudflare CDN, and Namecheap domain registrar.

- **Host: Cloud Run w/ Custom Domains**
  - https://console.cloud.google.com/run?project=slides2gifcom
  - https://cloud.google.com/run/docs/mapping-custom-domains
- **CDN: Cloudflare CDN**
  - https://dash.cloudflare.com/
- **Domain Registrar: Namecheap**
  - https://ap.www.namecheap.com/Domains/DomainControlPanel/slides2gif.com/domain/
  - Domain: **slides2gif.com**
    Nameservers: **Custom DNS**
  - `*.ns.cloudflare.com` (see Cloudflare for * name)
  - `*.ns.cloudflare.com` (see Cloudflare for * name)

The Cloudflare DNS records look like (with DOMAIN being `slides2gif.com`). Get the exact A/AAAA values from Cloud Run: `just domain-dns`.

| Type | Name | Content | Proxy Status |
| --- | --- | --- | --- |
| A | `@` (or `<DOMAIN>`) | `<generated IPv4 (apex from Cloud Run)>` | DNS Only |
| A | `@` | `<generated IPv4 (apex from Cloud Run)>` | DNS Only |
| … | (one A per Cloud Run record) | | DNS Only |
| AAAA | `@` | `<generated IPv6 (apex from Cloud Run)>` | DNS Only |
| AAAA | `@` | `<generated IPv6 (apex from Cloud Run)>` | DNS Only |
| … | (one AAAA per Cloud Run record) | | DNS Only |
| CNAME | `www` | `<DOMAIN>` | Proxied or DNS only (see below) |
| TXT | `@` | `google-site-verification=…` | DNS Only |

The `www` subdomain can redirect `www.DOMAIN` to `DOMAIN` via Cloudflare (e.g. Redirect Rules).

#### If www.slides2gif.com doesn’t work (apex works)

Cloud Run has a separate domain mapping for **www.slides2gif.com**. Use one of these:

**Option A – CNAME with DNS only (recommended first)**  
- In Cloudflare, edit the **www** CNAME record.  
- Set **Proxy status** to **DNS only** (grey cloud).  
- Keep **Name** `www`, **Content** `slides2gif.com`.  
- Save. After DNS propagates, `https://www.slides2gif.com` should hit Cloud Run with `Host: www.slides2gif.com` and use the www mapping/cert.

**Option B – A/AAAA for www (if CNAME still fails)**  
- In [Cloud Run → Domain mappings](https://console.cloud.google.com/run/domains?project=slides2gifcom), open **⋮** → **DNS records** for **www.slides2gif.com**.  
- In Cloudflare, **remove** the CNAME for `www` and add **A** and **AAAA** records for **Name** `www` with the **exact** values Cloud Run shows for www (often the same IPs as apex).  
- Use **DNS only** for those A/AAAA.  
- This sends www traffic straight to Cloud Run for the www mapping.

**Checklist**  
- Cloud Run has a mapping for **www.slides2gif.com** (run `just domain-map` if unsure).  
- In Cloudflare there is either: CNAME `www` → `slides2gif.com` (DNS only or Proxied) or A/AAAA for `www`.  
- If using Cloudflare proxy (orange cloud) for www, set SSL/TLS to **Full** or **Full (strict)** so the origin cert is used.

### Setup flow

1. **Verify domain** (one-time): `just domain-verify` → complete in Search Console; add the TXT record in Cloudflare if required.
2. **Create mappings**: `just domain-map` (maps apex + www to **slides2gif-www** service).
3. **Get records**: `just domain-dns` → add the A/AAAA for apex, CNAME `www` → `slides2gif.com` (Proxied), and TXT in Cloudflare.
4. Wait for DNS + Cloud Run managed cert (~15 min, up to 24 h). Test `https://slides2gif.com` and `https://www.slides2gif.com`.

### Commands

| Command | Description |
|--------|-------------|
| `just domain-verify` | Open Google domain verification (Search Console) |
| `just domain-map` | Create Cloud Run domain mappings for apex + www |
| `just domain-dns` | Print DNS records to add in Cloudflare |
| `just domain-dns-records` | Same records, raw output |
