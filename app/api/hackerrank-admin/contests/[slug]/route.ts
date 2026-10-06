import { NextRequest, NextResponse } from 'next/server';
import { getAdminContestDetail } from '@/lib/hackerrank-admin/contests';
import { getAdminSessionStatus } from '@/lib/hackerrank-admin/session';
import { isStatelessDeployment } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,120}$/i.test(slug)) {
    return NextResponse.json({ success: false, error: { code: 'invalid', message: 'Invalid contest slug.' } }, { status: 400 });
  }
  const refresh = request.nextUrl.searchParams.get('refresh') === '1';
  const result = await getAdminContestDetail(slug, refresh);
  const status = result.error && !result.data ? (result.error.code === 'not_found' ? 404 : 502) : 200;

  // Primary contest + student mapping need the database; stateless deployments return contest data only.
  if (isStatelessDeployment()) {
    const session = await getAdminSessionStatus();
    return NextResponse.json({ success: !result.error || Boolean(result.data), ...result, mapping: null, session }, { status });
  }

  // Imported lazily so Prisma is only loaded on the local, database-backed path.
  // Database problems only drop the mapping; the contest data is still returned.
  let mapping = null;
  try {
    const { applyPrimaryContest, getContestMappingView, getPrimarySetting } = await import('@/lib/hackerrank-admin/primary');

    // Fresh data for the primary contest flows straight to the dashboard.
    if (refresh && result.data && !result.error) {
      const primary = await getPrimarySetting();
      if (primary?.slug === slug) await applyPrimaryContest().catch((error) => console.error('Applying primary contest failed:', error));
    }
    mapping = result.data ? await getContestMappingView(slug, result.data).catch(() => null) : null;
  } catch (error) {
    console.error('Contest mapping unavailable:', error instanceof Error ? error.message : error);
  }

  const session = await getAdminSessionStatus();
  return NextResponse.json({ success: !result.error || Boolean(result.data), ...result, mapping, session }, { status });
}
