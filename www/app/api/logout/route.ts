import {getSession} from '../../../lib/sessionApp';
import {NextResponse} from 'next/server';

export async function POST() {
  try {
    const session = await getSession();

    session.user = undefined;
    session.isLoggedIn = false;
    session.googleUserId = undefined;
    session.googleOAuth = undefined;
    session.googleTokens = undefined;

    await session.save();

    return NextResponse.json({success: true});
  } catch (error: unknown) {
    console.error('Logout error:', error);
    return NextResponse.json({error: 'Failed to logout'}, {status: 500});
  }
}
