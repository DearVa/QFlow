/**
 * Compact candle vector structure shared across websocket and rest transports.
 * Index layout keeps payloads tiny while doc comments make it clear what each
 * column represents:
 * [0] unix open timestamp in milliseconds
 * [1] open price
 * [2] high price
 * [3] low price
 * [4] close price
 * [5] base asset volume
 * [6] unix close timestamp in milliseconds
 * [7] quote asset volume
 * [8] number of trades executed inside the candle
 * [9] taker buy base asset volume
 * [10] taker buy quote asset volume
 */
export interface UnifiedCandle extends Array<number> {
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
  candles: UnifiedCandle[];
}

export interface MarketUpdatePayload {
  type: 'update';
  symbol: string;
  interval: string;
  candle: UnifiedCandle;
}

export interface PerpetualMarket {
  symbol: string;
  label: string;
  description: string;
}
