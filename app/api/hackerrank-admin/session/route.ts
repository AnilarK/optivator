import { NextResponse } from 'next/server';
import {
  clearAdminSession,
  getAdminSessionStatus,
  HackerRankAdminError,
  reconnectAdminSession,
} from '@/lib/hackerrank-admin/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ success: true, status: await getAdminSessionStatus() });
}

/** Force a fresh login ("Reconnect"). */
export async function POST() {
  try {
    return NextResponse.json({ success: true, status: await reconnectAdminSession() });
  } catch (error) {
    const known = error instanceof HackerRankAdminError;
    return NextResponse.json(
      {
        success: false,
        error: known ? error.message : 'Could not connect to HackerRank.',
        code: known ? error.code : 'upstream',
        status: await getAdminSessionStatus(),
      },
      { status: known && error.code === 'not_configured' ? 400 : 502 },
    );
  }
}

/** Forget the stored session (it is re-created on the next request). */
export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true, status: await getAdminSessionStatus() });
}
