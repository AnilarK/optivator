/**
 * True when running on Vercel (it sets VERCEL=1 at build and run time). Deployments there have no
 * database and no writable disk, so HackerRank data is fetched per request and nothing is persisted.
 * Local development (no VERCEL variable) keeps the SQLite snapshot cache and session file.
 */
export function isStatelessDeployment(): boolean {
  return Boolean(process.env.VERCEL);
}
