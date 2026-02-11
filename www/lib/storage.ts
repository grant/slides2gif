import {Storage} from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

/**
 * Gets or creates the cache bucket
 */
function getBucket() {
  const storage = new Storage();
  return storage.bucket(BUCKET_NAME);
}

/**
 * Prefix for per-user GCS paths. All create/list/update of slides and GIFs
 * must use this prefix so each user only sees their own data.
 * API routes: getSessionUserId(session) → userPrefix(userId) → pass prefix
 * to every storage call (getCachedSlideUrl, cacheSlideThumbnail, etc.).
 */
export function userPrefix(userId: string): string {
  return `users/${userId}/`;
}

const PRESENTATION_META_PATH = (presentationId: string, prefix = '') =>
  `${prefix}presentations/${presentationId}/meta.json`;

/**
 * Gets the cache path for a slide thumbnail
 * Format: [prefix]presentations/{presentationId}/slides/{objectId}_{size}.png
 * All sizes use a suffix: _small, _medium, or _large
 */
export function getSlideCachePath(
  presentationId: string,
  objectId: string,
  size: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL',
  prefix = ''
): string {
  const basePath = `${prefix}presentations/${presentationId}/slides/${objectId}`;
  const sizeSuffix = size.toLowerCase();
  return `${basePath}_${sizeSuffix}.png`;
}

/**
 * Checks if a slide thumbnail exists in cache
 */
export async function slideExistsInCache(
  presentationId: string,
  objectId: string,
  size: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL',
  prefix = ''
): Promise<boolean> {
  try {
    const bucket = getBucket();
    const filePath = getSlideCachePath(presentationId, objectId, size, prefix);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('Error checking cache:', error);
    return false;
  }
}

/**
 * Gets a public URL for a cached slide thumbnail
 * Returns null if the file doesn't exist
 * Note: This assumes the bucket/file is publicly accessible
 */
export async function getCachedSlideUrl(
  presentationId: string,
  objectId: string,
  size: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL',
  prefix = ''
): Promise<string | null> {
  try {
    const bucket = getBucket();
    const filePath = getSlideCachePath(presentationId, objectId, size, prefix);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();

    if (!exists) {
      return null;
    }

    // Use public URL instead of signed URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    return publicUrl;
  } catch (error) {
    console.error('Error getting cached slide URL:', error);
    return null;
  }
}

/**
 * Saves presentation meta (first slide objectId) so we can resolve cached preview
 * without calling the Slides API.
 */
export async function savePresentationMeta(
  presentationId: string,
  firstSlideObjectId: string,
  prefix = ''
): Promise<void> {
  try {
    const bucket = getBucket();
    const file = bucket.file(PRESENTATION_META_PATH(presentationId, prefix));
    await file.save(JSON.stringify({firstSlideObjectId}), {
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Error saving presentation meta:', error);
  }
}

/**
 * Gets cached preview URL for a presentation (GCS only, no Slides API).
 * Uses meta.json if present; otherwise lists slides/ and uses first cached slide.
 */
export async function getCachedPresentationPreviewUrl(
  presentationId: string,
  prefix = ''
): Promise<string | null> {
  try {
    const bucket = getBucket();
    let objectId: string | null = null;

    const metaFile = bucket.file(
      PRESENTATION_META_PATH(presentationId, prefix)
    );
    const [metaExists] = await metaFile.exists();
    if (metaExists) {
      const [contents] = await metaFile.download();
      const meta = JSON.parse(contents.toString()) as {
        firstSlideObjectId?: string;
      };
      objectId = meta.firstSlideObjectId ?? null;
    }

    if (!objectId) {
      const slidesPrefix = `${prefix}presentations/${presentationId}/slides/`;
      const [files] = await bucket.getFiles({
        prefix: slidesPrefix,
        maxResults: 10,
      });
      const smallFile = files.find(f => f.name.endsWith('_small.png'));
      if (smallFile) {
        const match = smallFile.name.match(/\/slides\/(.+)_small\.png$/);
        if (match) objectId = match[1];
      }
    }

    if (!objectId) return null;
    return getCachedSlideUrl(presentationId, objectId, 'SMALL', prefix);
  } catch (error) {
    return null;
  }
}

/**
 * Caches a slide thumbnail by downloading from URL and uploading to GCS
 */
export async function cacheSlideThumbnail(
  presentationId: string,
  objectId: string,
  thumbnailUrl: string,
  size: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL',
  prefix = ''
): Promise<boolean> {
  try {
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to download thumbnail: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const bucket = getBucket();
    const filePath = getSlideCachePath(presentationId, objectId, size, prefix);
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000',
      },
    });

    await file.makePublic();

    console.log(`Cached slide thumbnail: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Error caching slide thumbnail:', error);
    return false;
  }
}

/**
 * Makes all files in a presentation's cache directory publicly readable
 */
export async function makePresentationFilesPublic(
  presentationId: string,
  prefix = ''
): Promise<{succeeded: number; failed: number}> {
  try {
    const bucket = getBucket();
    const slidesPrefix = `${prefix}presentations/${presentationId}/slides/`;
    const [files] = await bucket.getFiles({prefix: slidesPrefix});

    let succeeded = 0;
    let failed = 0;

    await Promise.all(
      files.map(async file => {
        try {
          await file.makePublic();
          succeeded++;
        } catch (error: unknown) {
          console.error(`Failed to make ${file.name} public:`, error);
          failed++;
        }
      })
    );

    return {succeeded, failed};
  } catch (error) {
    console.error('Error making presentation files public:', error);
    return {succeeded: 0, failed: 0};
  }
}

/**
 * Ensures the cache bucket exists, creates it if it doesn't
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();

    if (!exists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      await bucket.create({
        location: 'US',
        storageClass: 'STANDARD',
      });

      // Make bucket publicly readable
      await bucket.makePublic();
      console.log(`Bucket ${BUCKET_NAME} created and made public`);
    } else {
      // Ensure existing bucket is public
      try {
        await bucket.makePublic();
      } catch (error: unknown) {
        const err = error as {code?: number; message?: string};
        // Ignore if already public or no permission
        if (err.code !== 409) {
          console.warn(`Could not make bucket public: ${err.message}`);
        }
      }
    }
  } catch (error: unknown) {
    const err = error as {code?: number};
    // If bucket already exists or we don't have permission, that's okay
    if (err.code !== 409 && err.code !== 403) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  }
}
