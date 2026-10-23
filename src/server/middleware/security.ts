import compression from 'compression';
import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import type { Config } from '../config.js';

/** Content Security Policy: same-origin only, no inline script or style (docs/08 §2). */
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'none'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [],
};

const ONE_MINUTE = 60_000;
const ONE_DAY = 86_400_000;
const GLOBAL_PER_MIN = 120;
const AI_PER_DAY = 200;

const limiter = (windowMs: number, limit: number): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'rate_limited' });
    },
  });

/** Helmet, Permissions-Policy, compression and the global rate limit. */
export function applySecurity(app: Express): void {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: CSP_DIRECTIVES },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true },
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });
  app.use(compression());
  app.use('/api', limiter(ONE_MINUTE, GLOBAL_PER_MIN));
}

/** Per-IP limits for the routes that spend model tokens: per minute and per day. */
export const aiRateLimits = (config: Config): RequestHandler[] => [
  limiter(ONE_MINUTE, config.rateLimitPerMin),
  limiter(ONE_DAY, AI_PER_DAY),
];

/** API responses are never cached. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** Rejects mutating request bodies that are not JSON (415). */
export const requireJson: RequestHandler = (req, res, next) => {
  if (MUTATING_METHODS.includes(req.method) && !req.is('application/json')) {
    res.status(415).json({ error: 'unsupported_media_type' });
    return;
  }
  next();
};
