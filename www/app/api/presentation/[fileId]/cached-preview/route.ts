import {NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/sessionApp';
import {getAuthenticatedClientApp} from '../../../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../../../lib/oauthClient';
import {getCachedPresentationPreviewUrl, userPrefix} from '../../../../../lib/storage';

export async function GET(
  _request: Request,
  {params}: {params: Promise<{fileId: string}>}
) {
  const {fileId} = await params;

  if (!fileId) {
    return NextResponse.json(
      {error: 'Missing fileId parameter'},
      {status: 400}
    );
  }

  const session = await getSession();

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = await getSessionUserId(session);
  if (!userId) {
    return NextResponse.json(
      {
        error:
          'Could not identify user. Please log out and log in again.',
      },
      {status: 401}
    );
  }

  const prefix = userPrefix(userId);
  const previewUrl = await getCachedPresentationPreviewUrl(fileId, prefix);

  if (!previewUrl) {
    return NextResponse.json(
      {error: 'Preview not in cache'},
      {status: 404}
    );
  }

  return NextResponse.json({previewUrl});
}
