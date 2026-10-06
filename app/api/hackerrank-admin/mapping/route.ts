import { NextRequest, NextResponse } from 'next/server';
import { getPrimaryStatus, linkStudent, PrimaryContestError, unlinkStudent } from '@/lib/hackerrank-admin/primary';

export const dynamic = 'force-dynamic';

/** { studentId, username } links a student; { studentId, username: null } unlinks. */
export async function POST(request: NextRequest) {
  try {
    const { studentId, username } = (await request.json().catch(() => ({}))) as { studentId?: unknown; username?: unknown };
    if (typeof studentId !== 'string' || !studentId) throw new PrimaryContestError('studentId is required.');
    const summary = username === null || username === '' ? await unlinkStudent(studentId) : await linkStudent(studentId, username);
    return NextResponse.json({ success: true, summary, ...(await getPrimaryStatus()) });
  } catch (error) {
    if (error instanceof PrimaryContestError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('HackerRank mapping failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Could not update the mapping.' }, { status: 500 });
  }
}
