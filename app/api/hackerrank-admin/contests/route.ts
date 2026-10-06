import { NextRequest, NextResponse } from 'next/server';
import { getAdminContests } from '@/lib/hackerrank-admin/contests';
import { getAdminSessionStatus } from '@/lib/hackerrank-admin/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === '1';
  const result = await getAdminContests(refresh);
  const session = await getAdminSessionStatus();
  return NextResponse.json(
    { success: !result.error || Boolean(result.data), ...result, session },
    { status: result.error && !result.data ? 502 : 200 },
  );
}
