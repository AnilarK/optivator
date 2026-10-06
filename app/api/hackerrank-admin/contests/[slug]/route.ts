import { NextRequest, NextResponse } from 'next/server';
import { getAdminContestDetail } from '@/lib/hackerrank-admin/contests';
import { applyPrimaryContest, getContestMappingView, getPrimarySetting } from '@/lib/hackerrank-admin/primary';
import { getAdminSessionStatus } from '@/lib/hackerrank-admin/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,120}$/i.test(slug)) {
    return NextResponse.json({ success: false, error: { code: 'invalid', message: 'Invalid contest slug.' } }, { status: 400 });
  }
  const refresh = request.nextUrl.searchParams.get('refresh') === '1';
  const result = await getAdminContestDetail(slug, refresh);

  // Fresh data for the primary contest flows straight to the dashboard.
  if (refresh && result.data && !result.error) {
    const primary = await getPrimarySetting();
    if (primary?.slug === slug) await applyPrimaryContest().catch((error) => console.error('Applying primary contest failed:', error));
  }

  const [session, mapping] = await Promise.all([
    getAdminSessionStatus(),
    result.data ? getContestMappingView(slug, result.data).catch(() => null) : Promise.resolve(null),
  ]);
  const status = result.error && !result.data ? (result.error.code === 'not_found' ? 404 : 502) : 200;
  return NextResponse.json({ success: !result.error || Boolean(result.data), ...result, mapping, session }, { status });
}
