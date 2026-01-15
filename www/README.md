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
GET  /api/status
GET  /api/gif
GET  /api/gif/list
GET  /api/frames/list
GET  /api/presentation/list
POST /api/presentation/import
POST /api/oauth2
POST /api/oauth2callback
```

## Icons

This site uses Material Design icons distributed through Google Fonts.

- https://developers.google.com/fonts/docs/material_icons
- https://fonts.google.com/icons

## Buying a Domain

Here are steps needed to host this site on a domain:

- On namecheap, buy the domain.
- Setup Cloudflare DNS.
- Setup Cloud Run custom domains.

Here are links:

https://cloud.google.com/run/docs/mapping-custom-domains#command-line

```sh
gcloud domains verify slides2gif.com
gcloud beta run domain-mappings create --service slides2gif --domain slides2gif.com
```

Wait like 3 days.
