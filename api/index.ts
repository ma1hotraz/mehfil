import { bootstrap } from '../src/server/bootstrap.js';

/**
 * Vercel serverless entry. The static client is served by Vercel's CDN, so only the API runs
 * here; `vercel.json` rewrites every /api/* path to this function.
 */
export default bootstrap().app;
