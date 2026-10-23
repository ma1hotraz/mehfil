export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Record<string, string | number | boolean | undefined>;

export interface Logger {
  log(level: LogLevel, msg: string, fields?: LogFields): void;
}

const SECRET_KEY = /key|token|secret|authorization/i;

/** Redacts any field whose name looks like a credential. */
export function redact(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [
      name,
      SECRET_KEY.test(name) ? '[redacted]' : value,
    ]),
  );
}

/**
 * JSON-lines logger that Cloud Logging and Vercel both parse. Request bodies, questions, briefs
 * and model output must never be passed in `fields`.
 */
export function createLogger(
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
): Logger {
  return {
    log(level, msg, fields = {}) {
      write(JSON.stringify({ level, time: new Date().toISOString(), msg, ...redact(fields) }));
    },
  };
}

/** A no-op logger instance useful for unit tests where logs are suppressed. */
export const silentLogger: Logger = { log: () => undefined };
