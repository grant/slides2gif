import {NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/sessionApp';
import {getSessionUserId} from '../../../../../lib/oauthClient';
import {userPrefix, deleteMarkdownSlideCache} from '../../../../../lib/storage';

export async function POST() {
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

  const prefix = userPrefix(userId);
  const deleted = await deleteMarkdownSlideCache(prefix);
  return NextResponse.json({ok: true, deleted});
}
