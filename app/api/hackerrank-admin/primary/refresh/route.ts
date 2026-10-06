import { NextResponse } from 'next/server';
import { getAdminContestDetail } from '@/lib/hackerrank-admin/contests';
import { applyPrimaryContest, getPrimarySetting, getPrimaryStatus } from '@/lib/hackerrank-admin/primary';

export const dynamic = 'force-dynamic';

/** Dashboard "Refresh": re-fetch the primary contest from HackerRank and re-apply results to students. */
export async function POST() {
  const setting = await getPrimarySetting();
  if (!setting) {
    return NextResponse.json({ success: false, error: 'No primary contest is set. Choose one on the HackerRank Contests tab.' }, { status: 400 });
  }
  const result = await getAdminContestDetail(setting.slug, true);
  if (!result.data) {
    return NextResponse.json({ success: false, error: result.error?.message || 'Could not refresh the contest.' }, { status: 502 });
  }
  try {
    const summary = await applyPrimaryContest();
    return NextResponse.json({
      success: true,
      summary,
      // A failed HackerRank refresh still re-applies the last good snapshot; surface that as a warning.
      warning: result.error ? `${result.error.message} Showing the last successful data.` : null,
      ...(await getPrimaryStatus()),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Could not apply results.' }, { status: 500 });
  }
}
