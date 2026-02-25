import {NextRequest, NextResponse} from 'next/server';
import {
  getGifUpdateAuth,
  validateGifUrlAndPath,
  updateFileCustomMetadata,
  getGifBucket,
} from '../../../../lib/gcsGifMetadata';

export async function POST(request: NextRequest) {
  const auth = await getGifUpdateAuth(request);
  if (auth instanceof NextResponse) return auth;
  const {userId} = auth;

  let body: {gifUrl?: string; presentationTitle?: string};
  try {
    body = (await request.json()) as {
      gifUrl?: string;
      presentationTitle?: string;
    };
  } catch {
    return NextResponse.json({error: 'Invalid JSON body'}, {status: 400});
  }

  const {gifUrl, presentationTitle} = body;
  if (typeof presentationTitle !== 'string') {
    return NextResponse.json(
      {error: 'presentationTitle must be a string'},
      {status: 400}
    );
  }

  const pathResult = validateGifUrlAndPath(gifUrl ?? '', userId);
  if (pathResult instanceof NextResponse) return pathResult;
  const {path} = pathResult;

  try {
    const {bucket} = getGifBucket();
    const file = bucket.file(path);
    await updateFileCustomMetadata(file, {presentationTitle});
    return NextResponse.json({ok: true, presentationTitle});
  } catch (error: unknown) {
    const err = error as Error & {code?: number};
    console.error('[gifs/rename] Error updating metadata:', err);
    const message =
      err.code === 403
        ? 'Permission denied. Check bucket permissions.'
        : err.message || 'Failed to update title';
    return NextResponse.json({error: message}, {status: 500});
  }
}
