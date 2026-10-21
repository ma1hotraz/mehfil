export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

/** Today's date as `YYYY-MM-DD` (UTC). */
export const todayOf = (clock: Clock): string => clock.now().toISOString().slice(0, 10);
