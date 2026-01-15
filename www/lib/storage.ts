import { Storage, File } from "@google-cloud/storage";

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || "slides2gif-cache";

/**
 * Gets or creates the cache bucket
 */
function getBucket() {
  const storage = new Storage();
  return storage.bucket(BUCKET_NAME);
}

/**
 * Gets the cache path for a slide thumbnail
 * Format: presentations/{presentationId}/slides/{objectId}_{size}.jpg
 * All sizes use a suffix: _small, _medium, or _large
 */
export function getSlideCachePath(
  presentationId: string,
  objectId: string,
  size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL",
): string {
  const basePath = `presentations/${presentationId}/slides/${objectId}`;
  const sizeSuffix = size.toLowerCase();
  return `${basePath}_${sizeSuffix}.jpg`;
}

/**
 * Checks if a slide thumbnail exists in cache
 */
export async function slideExistsInCache(
  presentationId: string,
  objectId: string,
  size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL",
): Promise<boolean> {
  try {
    const bucket = getBucket();
    const filePath = getSlideCachePath(presentationId, objectId, size);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error("Error checking cache:", error);
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
  size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL",
): Promise<string | null> {
  try {
    const bucket = getBucket();
    const filePath = getSlideCachePath(presentationId, objectId, size);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();

    if (!exists) {
      return null;
    }

    // Use public URL instead of signed URL
    // Format: https://storage.googleapis.com/{bucket}/{filePath}
    // Or: https://{bucket}.storage.googleapis.com/{filePath}
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
    return publicUrl;
  } catch (error) {
    console.error("Error getting cached slide URL:", error);
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
  size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL",
): Promise<boolean> {
  try {
    // Download the image from the thumbnail URL
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to download thumbnail: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Upload to GCS
    const bucket = getBucket();
    const filePath = getSlideCachePath(presentationId, objectId, size);
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000", // Cache for 1 year
      },
    });

    // Make file publicly readable after upload
    await file.makePublic();

    console.log(`Cached slide thumbnail: ${filePath}`);
    return true;
  } catch (error) {
    console.error("Error caching slide thumbnail:", error);
    return false;
  }
}

/**
 * Makes all files in a presentation's cache directory publicly readable
 */
export async function makePresentationFilesPublic(
  presentationId: string,
): Promise<{ succeeded: number; failed: number }> {
  try {
    const bucket = getBucket();
    const prefix = `presentations/${presentationId}/slides/`;
    const [files] = await bucket.getFiles({ prefix });

    let succeeded = 0;
    let failed = 0;

    // Make each file public
    await Promise.all(
      files.map(async (file) => {
        try {
          await file.makePublic();
          succeeded++;
        } catch (error: any) {
          console.error(`Failed to make ${file.name} public:`, error);
          failed++;
        }
      }),
    );

    return { succeeded, failed };
  } catch (error) {
    console.error("Error making presentation files public:", error);
    return { succeeded: 0, failed: 0 };
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
        location: "US",
        storageClass: "STANDARD",
      });

      // Make bucket publicly readable
      await bucket.makePublic();
      console.log(`Bucket ${BUCKET_NAME} created and made public`);
    } else {
      // Ensure existing bucket is public
      try {
        await bucket.makePublic();
      } catch (error: any) {
        // Ignore if already public or no permission
        if (error.code !== 409) {
          console.warn(`Could not make bucket public: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    // If bucket already exists or we don't have permission, that's okay
    if (error.code !== 409 && error.code !== 403) {
      console.error("Error ensuring bucket exists:", error);
      throw error;
    }
  }
}
