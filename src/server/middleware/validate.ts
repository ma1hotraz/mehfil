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
