import type { RequestHandler } from 'express';
import * as z from 'zod/mini';

/** Field → message map from a zod error, keyed by dotted path. */
export function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join('.') || 'body';
    fields[path] ??= issue.message;
  }
  return fields;
}

/** Validates `req.body` with zod; on success the parsed value replaces the body. */
export function validate(schema: z.ZodMiniType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'invalid_request', fields: fieldErrors(result.error.issues) });
      return;
    }
    Object.assign(req, { body: result.data });
    next();
  };
}
