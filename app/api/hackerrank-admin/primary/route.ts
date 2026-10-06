import { NextRequest, NextResponse } from 'next/server';
import {
  getPrimaryStatus,
  PrimaryContestError,
  setPrimaryContest,
  unsetPrimaryContest,
  updatePassScore,
} from '@/lib/hackerrank-admin/primary';

export const dynamic = 'force-dynamic';

function fail(error: unknown) {
  if (error instanceof PrimaryContestError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error('Primary contest update failed:', error instanceof Error ? error.message : error);
  return NextResponse.json({ success: false, error: 'Could not update the primary contest.' }, { status: 500 });
}

async function body(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET() {
  return NextResponse.json({ success: true, ...(await getPrimaryStatus()) });
}

/** Make a contest primary: { slug, passScore } */
export async function PUT(request: NextRequest) {
  try {
    const { slug, passScore } = await body(request);
    if (typeof slug !== 'string' || !slug.trim()) throw new PrimaryContestError('Contest slug is required.');
    const summary = await setPrimaryContest(slug.trim(), passScore);
    return NextResponse.json({ success: true, summary, ...(await getPrimaryStatus()) });
  } catch (error) {
    return fail(error);
  }
}

/** Change the pass cutoff: { slug, passScore } */
export async function PATCH(request: NextRequest) {
  try {
    const { slug, passScore } = await body(request);
    if (typeof slug !== 'string' || !slug.trim()) throw new PrimaryContestError('Contest slug is required.');
    const summary = await updatePassScore(slug.trim(), passScore);
    return NextResponse.json({ success: true, summary, ...(await getPrimaryStatus()) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE() {
  try {
    await unsetPrimaryContest();
    return NextResponse.json({ success: true, ...(await getPrimaryStatus()) });
  } catch (error) {
    return fail(error);
  }
}
