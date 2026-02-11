import {NextResponse} from 'next/server';
import {getSession} from '../../../lib/sessionApp';
import {getAuthenticatedClientApp} from '../../../lib/oauthClientApp';

export async function GET() {
  const session = await getSession();

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    return NextResponse.json({presentations: []});
  } catch (error: unknown) {
    console.error('Error in presentations route:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch presentations',
        message: (error as Error).message,
      },
      {status: 500}
    );
  }
}
