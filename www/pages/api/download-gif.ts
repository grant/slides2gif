import type {NextApiRequest, NextApiResponse} from 'next';
import {getIronSession} from 'iron-session';
import {sessionOptions} from '../../lib/session';

const ALLOWED_BUCKET = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';
const ALLOWED_PREFIX = `https://storage.googleapis.com/${ALLOWED_BUCKET}/`;

/**
 * GET ?url=... - Proxies a GIF from our GCS bucket and returns it with
 * Content-Disposition: attachment so the browser downloads the file.
 * Only allows URLs from our cache bucket.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const session = await getIronSession(req, res, sessionOptions);
  if (!session.googleTokens?.access_token && !session.googleOAuth) {
    return res.status(401).json({error: 'Unauthorized'});
  }

  const url = req.query.url;
  if (typeof url !== 'string' || !url.startsWith(ALLOWED_PREFIX)) {
    return res.status(400).json({error: 'Invalid or disallowed URL'});
  }

  try {
    const response = await fetch(url, {method: 'GET'});
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch GIF',
      });
    }
    const contentType = response.headers.get('content-type') || 'image/gif';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="slides.gif"');
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('[download-gif] Error proxying GIF:', error);
    return res.status(500).json({error: 'Failed to download GIF'});
  }
}
