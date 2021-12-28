# www

The frontend.

## Features

Features shown on the site:

- Browse Google Slide Decks
- Create GIF
    - Select slide deck
    - Customize delay, number of slides, gif size
    - Download GIF
- Hosted on Cloud Run

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
