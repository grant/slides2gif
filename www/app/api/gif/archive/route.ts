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

  let body: {gifUrl?: string; archived?: boolean};
  try {
    body = (await request.json()) as {gifUrl?: string; archived?: boolean};
  } catch {
    return NextResponse.json(
      {error: 'Invalid JSON body'},
      {status: 400}
    );
  }

  const {gifUrl, archived} = body;
  if (typeof gifUrl !== 'string' || !gifUrl.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      {error: 'Invalid or disallowed gifUrl'},
      {status: 400}
    );
  }
  if (typeof archived !== 'boolean') {
    return NextResponse.json(
      {error: 'archived must be a boolean'},
      {status: 400}
    );
  }

  const path = gifUrl.slice(ALLOWED_PREFIX.length);
  const prefix = userPrefix(userId);

  console.log('[gif/archive] POST', {
    gifUrl: gifUrl.slice(0, 80) + '...',
    archived,
    path,
    prefix,
    pathStartsWithPrefix: path.startsWith(prefix),
  });

  if (!path.startsWith(prefix)) {
    return NextResponse.json(
      {error: 'You can only update your own GIFs'},
      {status: 403}
    );
  }

  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(path);

    const [current] = await file.getMetadata();
    console.log('[gif/archive] getMetadata() result keys:', Object.keys(current));
    console.log('[gif/archive] current.metadata:', JSON.stringify(current.metadata));

    // Custom metadata: can be at current.metadata (GCS API) or current.metadata.metadata (nested)
    const raw = current.metadata;
    const customMetadata: Record<string, string> = {};
    if (raw && typeof raw === 'object') {
      const nested = (raw as Record<string, unknown>).metadata;
      const src = (typeof nested === 'object' && nested !== null
        ? nested
        : raw) as Record<string, unknown>;
      for (const [k, v] of Object.entries(src)) {
        if (v !== null && v !== undefined && typeof v !== 'object') {
          customMetadata[k] = String(v);
        }
      }
    }
    const updated = {...customMetadata, archived: archived ? 'true' : 'false'};
    console.log('[gif/archive] customMetadata (parsed):', customMetadata);
    console.log('[gif/archive] updated (to set):', updated);

    await file.setMetadata({metadata: updated});
    console.log('[gif/archive] setMetadata() succeeded');

    return NextResponse.json({ok: true, archived});
  } catch (error: unknown) {
    const err = error as Error & {code?: number};
    console.error('[gif/archive] Error updating metadata:', err);
    console.error('[gif/archive] error.code:', err.code);
    const message =
      err.code === 403
        ? 'Permission denied. Check bucket permissions.'
        : err.message || 'Failed to update archive state';
    return NextResponse.json(
      {error: message},
      {status: 500}
    );
  }
}
