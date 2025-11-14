import type { MarketSnapshotPayload, MarketUpdatePayload, PerpetualMarketSymbol, UnifiedCandle } from '@qflow/shared/types';

export interface SubscriptionHandler {
  handle(payload: MarketSnapshotPayload | MarketUpdatePayload): void;
}

export interface StreamOptions {
  symbol: string;
  interval: string;
  limit: number;
}

export interface IMarketClient {
  getSupportedIntervals(): string[];
  getPerpetualMarkets(): PerpetualMarketSymbol[];
  getCandles(symbol: string, interval: string, limit: number): Promise<UnifiedCandle[]>;
  subscribeToCandles(options: StreamOptions, handler: SubscriptionHandler): Promise<() => void>;
}