/**
 * True when there is no database to use: on Vercel (VERCEL is set when system env vars are exposed)
 * or whenever DATABASE_URL is not configured. HackerRank data is then fetched per request and
 * nothing is persisted. Local development (DATABASE_URL in .env) keeps the SQLite snapshot cache
 * and session file.
 */
export function isStatelessDeployment(): boolean {
  return Boolean(process.env.VERCEL) || !process.env.DATABASE_URL;
}
