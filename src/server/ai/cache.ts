interface Entry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Tiny LRU cache with a TTL. Map iteration order doubles as recency order, so no dependency
 * is needed. `now` is injectable for tests.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    this.entries.delete(key);
    if (entry.expiresAt <= this.now()) {
      return undefined;
    }
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) {
        break;
      }
      this.entries.delete(oldest.value);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
