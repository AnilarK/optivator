import { NextRequest, NextResponse } from 'next/server';
import { getPrimaryStatus, PrimaryContestError, setResultOverride } from '@/lib/hackerrank-admin/primary';

export const dynamic = 'force-dynamic';

/** { studentId, contestSlug, result: 'pass' | 'fail' | 'auto' } */
export async function POST(request: NextRequest) {
  try {
    const { studentId, contestSlug, result } = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof studentId !== 'string' || !studentId) throw new PrimaryContestError('studentId is required.');
    if (typeof contestSlug !== 'string' || !contestSlug) throw new PrimaryContestError('contestSlug is required.');
    const summary = await setResultOverride(studentId, contestSlug, result);
    return NextResponse.json({ success: true, summary, ...(await getPrimaryStatus()) });
  } catch (error) {
    if (error instanceof PrimaryContestError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('HackerRank override failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Could not save the result.' }, { status: 500 });
  }
}
