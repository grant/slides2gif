import {getSession} from '../../../lib/sessionApp';
import {APIResUser} from '../../../types/user';
import {NextResponse} from 'next/server';

export async function GET() {
  const session = await getSession();

  let resObject: APIResUser;
  if (session.googleOAuth) {
    session.count = (session.count ?? 0) + 1;
    await session.save();

    resObject = {
      auth: session.googleOAuth,
      count: session.count,
      isLoggedIn: true,
    };
  } else {
    resObject = {
      isLoggedIn: false,
    };
  }

  return NextResponse.json(resObject);
}
