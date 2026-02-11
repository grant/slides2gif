/**
 * Session helpers for App Router (Route Handlers).
 * Uses iron-session v8's cookies() API.
 */
import {cookies} from 'next/headers';
import {getIronSession} from 'iron-session';
import {sessionOptions} from './session';

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}
