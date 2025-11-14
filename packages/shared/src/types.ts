/**
 * Compact candle vector structure shared across websocket and rest transports.
 * Index layout keeps payloads tiny while doc comments make it clear what each
 */
export type UnifiedCandle = readonly [
  openTime: number,
  open: number,
  high: number,
  low: number,
  close: number,
  baseVolume: number,
  closeTime: number,
  quoteVolume: number,
  tradeCount: number,
  takerBuyBaseVolume: number,
  takerBuyQuoteVolume: number
];

export const enum UCIdx {
  // unix open timestamp in milliseconds
  OpenTime = 0,

  // open price
  Open = 1,

  // high price
  High = 2,

  // low price
  Low = 3,

  // close price
  Close = 4,

  // base asset volume
  BaseVolume = 5,

  // unix close timestamp in milliseconds
  CloseTime = 6,

  // quote asset volume
  QuoteVolume = 7,

  // number of trades executed inside the candle
  TradeCount = 8,

  // taker buy base asset volume
  TakerBuyBaseVolume = 9,

  // taker buy quote asset volume
  TakerBuyQuoteVolume = 10,
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

export interface PerpetualMarketSymbol {
  symbol: string;
  label: string;
  description: string;
}

export interface SupportedIntervalsResponse {
  intervals: string[];
}

export interface MarketSymbolMetadataResponse {
  symbols: PerpetualMarketSymbol[];
}

export type MarketServerMessage =
  | { type: 'snapshot'; payload: MarketSnapshotPayload }
  | { type: 'update'; payload: MarketUpdatePayload }
  | { type: 'intervals'; payload: string[] }
  | { type: 'perpetuals'; payload: PerpetualMarketSymbol[] }
  | { type: 'error'; message: string };
