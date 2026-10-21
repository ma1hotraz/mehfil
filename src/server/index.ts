import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { bootstrap } from './bootstrap.js';

const SHUTDOWN_GRACE_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;
const HEADERS_TIMEOUT_MS = 10_000;

const here = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const { app, config, logger, ai } = bootstrap(
  process.env,
  isProduction ? path.resolve(here, '../../client') : undefined,
);

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.log('info', 'listening', { port: config.port, ai: ai.enabled ? 'enabled' : 'disabled' });
});
server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;

process.on('SIGTERM', () => {
  logger.log('info', 'shutdown');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref();
});
