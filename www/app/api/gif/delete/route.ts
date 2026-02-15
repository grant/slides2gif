import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../lib/sessionApp';
import {getSessionUserId} from '../../../../lib/oauthClient';
import {userPrefix} from '../../../../lib/storage';
import {Storage} from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';
const ALLOWED_PREFIX = `https://storage.googleapis.com/${BUCKET_NAME}/`;

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session.googleTokens?.access_token && !session.googleOAuth) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const userId = await getSessionUserId(session);
  if (!userId) {
    return NextResponse.json(
      {error: 'Could not identify user. Please log out and log in again.'},
      {status: 401}
    );
  }

  let body: {gifUrl?: string};
  try {
    body = (await request.json()) as {gifUrl?: string};
  } catch {
    return NextResponse.json(
      {error: 'Invalid JSON body'},
      {status: 400}
    );
  }

  const {gifUrl} = body;
  if (typeof gifUrl !== 'string' || !gifUrl.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      {error: 'Invalid or disallowed gifUrl'},
      {status: 400}
    );
  }

  const path = gifUrl.slice(ALLOWED_PREFIX.length);
  const prefix = userPrefix(userId);

  if (!path.startsWith(prefix)) {
    return NextResponse.json(
      {error: 'You can only delete your own GIFs'},
      {status: 403}
    );
  }

  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(path);
    await file.delete();
    return NextResponse.json({ok: true});
  } catch (error: unknown) {
    const err = error as Error & {code?: number};
    console.error('[gif/delete] Error deleting file:', err);
    const message =
      err.code === 403
        ? 'Permission denied. Check bucket permissions.'
        : err.message || 'Failed to delete GIF';
    return NextResponse.json(
      {error: message},
      {status: 500}
    );
  }
}
