import {NextResponse} from 'next/server';
import {getSession} from '../../../lib/sessionApp';
import {getAuthenticatedClientApp} from '../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../lib/oauthClient';
import {userPrefix} from '../../../lib/storage';
import {parseCustomMetadata} from '../../../lib/gcsGifMetadata';
import {Storage} from '@google-cloud/storage';
import {dashboardStatsSchema} from '../../../lib/api/schemas';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

export async function GET() {
  const session = await getSession();

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  const userId = await getSessionUserId(session);
  if (!userId) {
    return NextResponse.json(
      {
        error: 'Could not identify user. Please log out and log in again.',
      },
      {status: 401}
    );
  }

  const prefix = userPrefix(userId);

  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    const [files] = await bucket.getFiles({
      prefix: `${prefix}presentations/`,
    });

    const uniqueSlides = new Set<string>();
    const uniquePresentations = new Set<string>();

    files.forEach(file => {
      const match = file.name.match(
        /\/presentations\/([^/]+)\/slides\/([^_]+)_/
      );
      if (match) {
        uniqueSlides.add(`${match[1]}:${match[2]}`);
        uniquePresentations.add(match[1]);
      }
    });

    const totalSlidesProcessed = uniqueSlides.size;
    const presentationsLoaded = uniquePresentations.size;

    const [gifFiles] = await bucket.getFiles({prefix});

    const gifList = gifFiles.filter(
      file => file.name.endsWith('.gif') && file.name.startsWith(prefix)
    );

    // Sort by list metadata timeCreated (we only need order for top 50).
    const sorted = [...gifList].sort((a, b) => {
      const tA = (a.metadata?.timeCreated && new Date(String(a.metadata.timeCreated)).getTime()) || 0;
      const tB = (b.metadata?.timeCreated && new Date(String(b.metadata.timeCreated)).getTime()) || 0;
      return tB - tA;
    });
    const top50 = sorted.slice(0, 50);

    // Fetch full metadata for displayed GIFs so custom metadata (e.g. presentationTitle
    // after rename) is current. List response may omit or cache custom metadata.
    const gifsWithMeta = await Promise.all(
      top50.map(async file => {
        const [meta] = await file.getMetadata();
        const custom = parseCustomMetadata(
          meta && typeof meta === 'object' ? (meta as {metadata?: unknown}).metadata : undefined
        );
        const createdAt =
          meta && typeof meta === 'object' && meta.timeCreated
            ? new Date(String(meta.timeCreated)).getTime()
            : Date.now();
        const presentationId =
          typeof custom.presentationId === 'string'
            ? custom.presentationId
            : undefined;
        const presentationTitle =
          typeof custom.presentationTitle === 'string'
            ? custom.presentationTitle
            : undefined;
        return {
          url: `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
          createdAt,
          presentationId,
          presentationTitle,
        };
      })
    );

    const gifs = gifsWithMeta.sort((a, b) => b.createdAt - a.createdAt);

    const stats = {
      gifsCreated: gifList.length,
      presentationsLoaded,
      totalSlidesProcessed,
      gifs,
    };

    const parsed = dashboardStatsSchema.safeParse(stats);
    if (!parsed.success) {
      console.error('Stats response validation failed:', parsed.error.issues);
      return NextResponse.json(
        {error: 'Internal response validation failed'},
        {status: 500}
      );
    }

    const response = NextResponse.json(parsed.data);
    // Don't cache so renames and other metadata changes show after refresh
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error: unknown) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        error: (error as Error).message || 'Failed to fetch stats',
      },
      {status: 500}
    );
  }
}
