import { NextResponse } from 'next/server';
import { getHackerRankAuth, getHackerRankSyncStatus, refreshHackerRankContest } from '@/lib/hackerrank-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [sync, questions] = await Promise.all([
      getHackerRankSyncStatus(),
      Promise.resolve((process.env.HACKERRANK_QUESTION_SLUGS || 'castle-on-the-grid,new-year-chaos')
        .split(',').map((slug) => slug.trim()).filter(Boolean)),
    ]);
    return NextResponse.json({
      success: true,
      contestSlug: sync?.contestSlug || process.env.HACKERRANK_CONTEST_SLUG || 'optus-sde-hiring-assessment-2026',
      lastSyncedAt: sync?.lastSyncedAt || null,
      questionSlugs: questions,
      authenticationConfigured: Boolean(getHackerRankAuth().cookie),
    });
  } catch (error) {
    console.error('Error reading HackerRank sync status:', error);
    return NextResponse.json({ success: false, error: 'Failed to read HackerRank sync status' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await refreshHackerRankContest();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HackerRank synchronization failed.';
    console.error('HackerRank synchronization failed:', message);
    const status = message.includes('rate limit') ? 429 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}