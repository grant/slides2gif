import {NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/sessionApp';
import {google} from 'googleapis';
import {getAuthenticatedClientApp} from '../../../../../lib/oauthClientApp';

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

  try {
    const {client: auth} = authResult;
    const slides = google.slides({version: 'v1', auth: auth as google.auth.OAuth2Client});

    const presentation = await slides.presentations.get({
      presentationId: fileId,
      fields: 'presentationId,title,locale,revisionId,slides(objectId)',
    });

    const presentationData = presentation.data;
    const slideCount = presentationData.slides?.length || 0;
    const slideObjectIds =
      presentationData.slides?.map(slide => slide.objectId || '') || [];

    return NextResponse.json({
      id: fileId,
      title: presentationData.title,
      locale: presentationData.locale,
      revisionId: presentationData.revisionId,
      slideCount,
      slideObjectIds,
    });
  } catch (error: unknown) {
    console.error('Error fetching presentation metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch presentation metadata',
        message: (error as Error).message,
      },
      {status: 500}
    );
  }
}
