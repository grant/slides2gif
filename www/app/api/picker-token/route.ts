import {NextResponse} from 'next/server';
import {getSession} from '../../../lib/sessionApp';
import {getAuthenticatedClientApp} from '../../../lib/oauthClientApp';

export async function GET() {
  const session = await getSession();

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  const credentials = authResult.client.credentials;
  const accessToken = credentials.access_token;
  if (!accessToken) {
    return NextResponse.json({error: 'No access token'}, {status: 401});
  }

  const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER || '';
  const developerKey =
    process.env.GOOGLE_PICKER_DEVELOPER_KEY || process.env.GOOGLE_API_KEY || '';
  if (!appId || !developerKey) {
    console.error(
      '[picker-token] Missing GOOGLE_CLOUD_PROJECT_NUMBER or GOOGLE_PICKER_DEVELOPER_KEY/GOOGLE_API_KEY.'
    );
    return NextResponse.json(
      {
        error:
          'Picker not configured. Add GOOGLE_CLOUD_PROJECT_NUMBER and GOOGLE_PICKER_DEVELOPER_KEY to GSM or environment.',
      },
      {status: 503}
    );
  }

  return NextResponse.json({
    accessToken,
    appId,
    developerKey,
  });
}
