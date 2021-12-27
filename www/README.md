# www

The frontend.

## Buying a Domain

- On namecheap, buy the domain.
- Setup Cloudflare
- Setup Cloud Run custom domains

https://cloud.google.com/run/docs/mapping-custom-domains#command-line

```sh
gcloud domains verify slides2gif.com
gcloud beta run domain-mappings create --service slides2gif --domain slides2gif.com
```