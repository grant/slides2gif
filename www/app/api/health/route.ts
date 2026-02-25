import {NextResponse} from 'next/server';

/** Standard health check: GET /api/health → { status: "ok" }. */
export async function GET() {
  return NextResponse.json({status: 'ok'});
}
