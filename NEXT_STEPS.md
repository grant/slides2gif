# Next Steps

## 1. Verify Secrets Are Ready

Make sure all secrets exist in Secret Manager:

```bash
just verify-secrets
```

Or sync them from your `.env.local`:

```bash
just sync-secrets
```

## 2. Deploy to Production

Deploy both services to Cloud Run:

```bash
just deploy
```

This will:
- Deploy `png2gif` service first
- Deploy `www` service (auto-discovers png2gif URL)
- Configure IAM permissions automatically
- Grant secret access to service accounts

## 3. Or Deploy to Staging First

If you want to test in staging first:

```bash
just stage
```

## 4. Verify Deployment

After deployment, check your services:

```bash
# List services
gcloud run services list --project slides2gifcom --region us-central1

# Get service URLs
gcloud run services describe slides2gif-www \
  --region us-central1 \
  --project slides2gifcom \
  --format 'value(status.url)'
```

## 5. Run Setup Again (Optional)

After first deployment, run setup again to ensure all IAM permissions are configured:

```bash
just setup
```

This will grant secret access to the newly created service accounts.

## Troubleshooting

If deployment fails:
- Check that all secrets exist: `just verify-secrets`
- Ensure you're authenticated: `gcloud auth list`
- Check Cloud Build logs: `gcloud builds list --project slides2gifcom --limit 5`
