/** The user's local calendar date as `YYYY-MM-DD` (what "today" means to them). */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const nowIso = (now: Date = new Date()): string => now.toISOString();
