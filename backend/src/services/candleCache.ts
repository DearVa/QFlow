import type { UnifiedCandle } from './types';

export interface CandleCacheKey {
  symbol: string;
  interval: string;
  limit: number;
}

interface CacheEntry {
  candles: UnifiedCandle[];
  expiresAt: number;
}

export class CandleCache {
  private readonly hotCache = new Map<string, CacheEntry>();
  private readonly warmCache = new Map<string, CacheEntry>();

  constructor(
    private readonly hotTtlMs = 900,
    private readonly warmTtlMs = 5_000,
    private readonly warmMaxEntries = 32
  ) {}

  private static serializeKey(key: CandleCacheKey): string {
    return `${key.symbol}:${key.interval}:${key.limit}`;
  }

  private evictWarmEntries(): void {
    if (this.warmCache.size <= this.warmMaxEntries) {
      return;
    }
    const entries = Array.from(this.warmCache.entries()).sort(([, a], [, b]) => a.expiresAt - b.expiresAt);
    const overflow = this.warmCache.size - this.warmMaxEntries;
    for (let i = 0; i < overflow; i += 1) {
      const [key] = entries[i];
      this.warmCache.delete(key);
    }
  }

  async resolve(key: CandleCacheKey, loader: () => Promise<UnifiedCandle[]>): Promise<UnifiedCandle[]> {
    const serialized = CandleCache.serializeKey(key);
    const now = Date.now();

    const hotEntry = this.hotCache.get(serialized);
    if (hotEntry && hotEntry.expiresAt > now) {
      return hotEntry.candles;
    }

    const warmEntry = this.warmCache.get(serialized);
    if (warmEntry && warmEntry.expiresAt > now) {
      this.hotCache.set(serialized, { candles: warmEntry.candles, expiresAt: now + this.hotTtlMs });
      return warmEntry.candles;
    }

    const candles = await loader();
    this.hotCache.set(serialized, { candles, expiresAt: now + this.hotTtlMs });
    this.warmCache.set(serialized, { candles, expiresAt: now + this.warmTtlMs });
    this.evictWarmEntries();
    return candles;
  }

  update(key: CandleCacheKey, candles: UnifiedCandle[]): void {
    const serialized = CandleCache.serializeKey(key);
    const now = Date.now();
    const hotEntry = { candles, expiresAt: now + this.hotTtlMs };
    const warmEntry = { candles, expiresAt: now + this.warmTtlMs };
    this.hotCache.set(serialized, hotEntry);
    this.warmCache.set(serialized, warmEntry);
  }
}
