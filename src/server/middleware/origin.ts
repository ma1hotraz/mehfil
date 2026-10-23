import type { RequestHandler } from 'express';

/** The host a browser used to reach us, honouring the single trusted proxy (Vercel). */
const hostOf = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim().toLowerCase() ?? '';

/** Host part of an `Origin` header, or an empty string when it is missing or malformed. */
function originHost(origin: string | undefined): string {
  try {
    return origin ? new URL(origin).host.toLowerCase() : '';
  } catch {
    return '';
  }
}

/**
 * Refuses state-changing requests that a browser sent from another site, so a third-party page
 * cannot spend this app's AI quota through a visitor's browser. Requests with no browser origin
 * headers (curl, server-to-server, tests) are allowed: rate limits cover those.
 */
export const sameOriginOnly: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  const site = req.headers['sec-fetch-site'];
  const origin = req.headers.origin;
  const host = hostOf(req.headers['x-forwarded-host']) || hostOf(req.headers.host);
  // A present but unusable Origin (including "null" from sandboxed frames) is refused too.
  const crossSite = site === 'cross-site' || (origin !== undefined && originHost(origin) !== host);
  if (crossSite) {
    res.status(403).json({ error: 'forbidden_origin' });
    return;
  }
  next();
};
