import {headers} from 'next/headers';
import {Auth} from '../../../lib/oauth';
import {NextResponse} from 'next/server';

export async function GET() {
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const baseURL =
    host.includes('localhost') || host.includes('127.0.0.1')
      ? `http://${host}`
      : `https://${host}`;

  Auth.setup(baseURL);
  const authUrl = Auth.getAuthURL();

  return NextResponse.redirect(authUrl);
}
