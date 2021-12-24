# auth

A simple service that handles Google OAuth

## Setup

Create a `.env` file:

```
OAUTH_CLIENT_ID=xxx-yyy.apps.googleusercontent.com
OAUTH_CLIENT_SECRET=zzz-fffffffffffffff
```

## Credentials

### Setup OAuth Consent Screen

To publish an OAuth app, you must setup a user-facing OAuth consent screen:

1. Open https://console.cloud.google.com/apis/credentials/consent
1. Set **App name**: slides2gif
1. Set **Publishing status**: In production
1. Set **User type**: External
1. Set **Authorized domains**:
  - https://slides2gif-*.run.app/oauth2callback
  - https://localhost:8080/oauth2callback
1. Use defaults for everything else and save.
1. Save.

### Create OAuth 2.0 Client ID

A OAuth credential authorizes usage of Google Slides and other Google Workspace APIs:

1. Open https://console.cloud.google.com/apis/credentials
1. **Create Credentials** > **OAuth client ID**
1. **Application type**: Web application
1. **Name**: slides2gif-oauth
1. **Authorized redirect URIs**:
  - https://slides2gif-*.run.app/oauth2callback
  - https://localhost:8080/oauth2callback
1. Save.
