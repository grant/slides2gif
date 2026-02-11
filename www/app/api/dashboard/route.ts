import {NextResponse} from 'next/server';
import {getSession} from '../../../lib/sessionApp';
import {getAuthenticatedClientApp} from '../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../lib/oauthClient';
import {userPrefix} from '../../../lib/storage';
import {Storage} from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

interface DashboardStats {
  gifsCreated: number;
  presentationsLoaded: number;
  totalSlidesProcessed: number;
  gifs: Array<{
    url: string;
    createdAt: number;
    presentationId?: string;
    presentationTitle?: string;
  }>;
}

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
        error:
          'Could not identify user. Please log out and log in again.',
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

    const gifs = gifFiles
      .filter(
        file => file.name.endsWith('.gif') && file.name.startsWith(prefix)
      )
      .map(file => {
        const createdAt = file.metadata.timeCreated
          ? new Date(String(file.metadata.timeCreated)).getTime()
          : Date.now();
        const customMetadata = (file.metadata.metadata || {}) as Record<
          string,
          string
        >;
        const presentationId =
          typeof customMetadata.presentationId === 'string'
            ? customMetadata.presentationId
            : undefined;
        const presentationTitle =
          typeof customMetadata.presentationTitle === 'string'
            ? customMetadata.presentationTitle
            : undefined;
        return {
          url: `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
          createdAt,
          presentationId,
          presentationTitle,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    const stats: DashboardStats = {
      gifsCreated: gifs.length,
      presentationsLoaded,
      totalSlidesProcessed,
      gifs: gifs.slice(0, 50),
    };

    const response = NextResponse.json(stats);
    response.headers.set(
      'Cache-Control',
      'private, max-age=300, stale-while-revalidate=600'
    );
    return response;
  } catch (error: unknown) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        error:
          (error as Error).message || 'Failed to fetch dashboard stats',
      },
      {status: 500}
    );
  }
}
