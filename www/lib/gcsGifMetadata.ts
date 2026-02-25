/**
 * Shared helpers for GCS GIF metadata (archive, rename, etc.).
 * Used by POST /api/gifs/archive and POST /api/gifs/rename.
 */
import {NextRequest, NextResponse} from 'next/server';
import {Storage} from '@google-cloud/storage';
import {getSession} from './sessionApp';
import {getSessionUserId} from './oauthClient';
import {userPrefix} from './storage';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';
const ALLOWED_PREFIX = `https://storage.googleapis.com/${BUCKET_NAME}/`;

/** Returns authenticated userId or a 401 NextResponse. */
export async function getGifUpdateAuth(
  _request: NextRequest
): Promise<{userId: string} | NextResponse> {
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
  return {userId};
}

/** Validates gifUrl format and ownership. Returns path or an error NextResponse. */
export function validateGifUrlAndPath(
  gifUrl: string,
  userId: string
): {path: string} | NextResponse {
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
      {error: 'You can only update your own GIFs'},
      {status: 403}
    );
  }
  return {path};
}

/**
 * Parse custom metadata from GCS getMetadata() result.
 * Handles both top-level metadata and nested metadata.metadata (API shape).
 */
export function parseCustomMetadata(raw: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return result;
  const nested = (raw as Record<string, unknown>).metadata;
  const src = (
    typeof nested === 'object' && nested !== null ? nested : raw
  ) as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    if (v != null && typeof v !== 'object') {
      result[k] = String(v);
    }
  }
  return result;
}

/**
 * Read current custom metadata, merge updates, and set.
 * @param file - GCS File from bucket.file(path); getMetadata() returns [metadata, apiResponse].
 */
export async function updateFileCustomMetadata(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GCS File type varies by version
  file: any,
  updates: Record<string, string>
): Promise<void> {
  const [current] = await file.getMetadata();
  const custom = parseCustomMetadata(
    current && typeof current === 'object'
      ? (current as {metadata?: unknown}).metadata
      : undefined
  );
  await file.setMetadata({metadata: {...custom, ...updates}});
}

/** Get bucket name and Storage instance for GIF routes. */
export function getGifBucket(): {
  bucketName: string;
  bucket: ReturnType<Storage['bucket']>;
} {
  const storage = new Storage();
  return {bucketName: BUCKET_NAME, bucket: storage.bucket(BUCKET_NAME)};
}
