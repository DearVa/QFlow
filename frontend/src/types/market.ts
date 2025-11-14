/**
 * Frontend twin of the compact candle tuple used across the websocket bridge.
 * Each index is annotated to keep payloads minimal without losing clarity:
 * [0] unix open timestamp in milliseconds
 * [1] open price
 * [2] high price
 * [3] low price
 * [4] close price
 * [5] base asset volume
 * [6] unix close timestamp in milliseconds
 * [7] quote asset volume
 * [8] trade count inside the candle
 * [9] taker buy base asset volume
 * [10] taker buy quote asset volume
 */
export interface CompactCandle extends Array<number> {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
  7: number;
  8: number;
  9: number;
  10: number;
}

export interface MarketSnapshotPayload {
  type: 'snapshot';
  symbol: string;
  interval: string;
  candles: CompactCandle[];
}

export interface MarketUpdatePayload {
  type: 'update';
  symbol: string;
  interval: string;
  candle: CompactCandle;
}

export interface MarketPerpetualSymbol {
  symbol: string;
  label: string;
  description: string;
}

export interface SupportedIntervalsResponse {
  intervals: string[];
}

export interface MarketSymbolMetadataResponse {
  symbols: MarketPerpetualSymbol[];
}

export type MarketServerMessage =
  | { type: 'snapshot'; payload: MarketSnapshotPayload }
  | { type: 'update'; payload: MarketUpdatePayload }
  | { type: 'intervals'; payload: string[] }
  | { type: 'perpetuals'; payload: MarketPerpetualSymbol[] }
  | { type: 'error'; message: string };
