import { Spot } from '@binance/spot';
import { URL } from 'url';
import WebSocket from 'ws';
import type { CandleCacheKey } from './candleCache';
import { CandleCache } from './candleCache';
import type { MarketSnapshotPayload, MarketUpdatePayload, PerpetualMarket, UnifiedCandle } from './types';

interface ProxyConfiguration {
  host: string;
  port: number;
  protocol?: string;
  auth?: {
    username: string;
    password: string;
  };
}

interface SubscriptionHandler {
  handle(payload: MarketSnapshotPayload | MarketUpdatePayload): void;
}

interface StreamOptions {
  symbol: string;
  interval: string;
  limit: number;
}

const SUPPORTED_INTERVALS = [
  '1s',
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M'
];

const PERPETUAL_MARKETS: PerpetualMarket[] = [
  { symbol: 'BTCUSDT', label: 'BTC / USDT', description: 'Bitcoin perpetual' },
  { symbol: 'ETHUSDT', label: 'ETH / USDT', description: 'Ethereum perpetual' },
  { symbol: 'BNBUSDT', label: 'BNB / USDT', description: 'BNB perpetual' },
  { symbol: 'SOLUSDT', label: 'SOL / USDT', description: 'Solana perpetual' }
];

class CandleStream {
  private readonly subscribers = new Set<SubscriptionHandler>();
  private readonly cacheKey: CandleCacheKey;
  private candles: UnifiedCandle[] = [];
  private socket: WebSocket | null = null;
  private reconnectHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly options: StreamOptions,
    initialCandles: UnifiedCandle[],
    private readonly cache: CandleCache,
    private readonly onIdle: () => void
  ) {
    this.cacheKey = {
      symbol: this.options.symbol,
      interval: this.options.interval,
      limit: this.options.limit,
    };
    this.candles = initialCandles;
    this.cache.update(this.cacheKey, initialCandles);
    this.connect();
  }

  async subscribe(handler: SubscriptionHandler): Promise<() => void> {
    this.subscribers.add(handler);
    handler.handle({
      type: 'snapshot',
      symbol: this.options.symbol,
      interval: this.options.interval,
      candles: this.candles,
    });

    return () => {
      this.subscribers.delete(handler);
      if (this.subscribers.size === 0) {
        this.teardown();
        this.onIdle();
      }
    };
  }

  private teardown(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectHandle) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }
  }

  private connect(): void {
    const streamName = `${this.options.symbol.toLowerCase()}@kline_${this.options.interval}`;
    const ws = new WebSocket(`wss://stream.binance.com/ws/${streamName}`);
    this.socket = ws;

    ws.on('message', data => {
      try {
        const payload = JSON.parse(data.toString());
        if (!payload.k) {
          return;
        }
        const nextCandle = CandleStream.normalizeFromWs(payload.k);
        this.upsertCandle(nextCandle);
        this.broadcast({
          type: 'update',
          symbol: this.options.symbol,
          interval: this.options.interval,
          candle: nextCandle,
        });
      } catch (error) {
        console.error('Failed to process Binance kline', error);
      }
    });

    ws.on('close', () => {
      this.scheduleReconnect();
    });

    ws.on('error', error => {
      console.error('Binance websocket error', error);
      ws.close();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectHandle) {
      return;
    }
    this.reconnectHandle = setTimeout(() => {
      this.reconnectHandle = null;
      if (this.subscribers.size > 0) {
        this.connect();
      }
    }, 1_000);
  }

  private upsertCandle(candle: UnifiedCandle): void {
    const index = this.candles.findIndex(entry => entry[0] === candle[0]);
    if (index >= 0) {
      this.candles[index] = candle;
    } else {
      this.candles.push(candle);
      if (this.candles.length > this.options.limit) {
        this.candles.splice(0, this.candles.length - this.options.limit);
      }
    }
    this.cache.update(this.cacheKey, this.candles);
  }

  private broadcast(payload: MarketSnapshotPayload | MarketUpdatePayload): void {
    this.subscribers.forEach(handler => handler.handle(payload));
  }

  private static normalizeFromWs(kline: any): UnifiedCandle {
    return [
      Number(kline.t),
      Number(kline.o),
      Number(kline.h),
      Number(kline.l),
      Number(kline.c),
      Number(kline.v),
      Number(kline.T),
      Number(kline.q),
      Number(kline.n),
      Number(kline.V),
      Number(kline.Q),
    ] as UnifiedCandle;
  }
}

export class BinanceClient {
  private readonly spot: Spot;
  private readonly cache = new CandleCache();
  private readonly streams = new Map<string, CandleStream>();

  constructor() {
    const key = process.env.BINANCE_API_KEY ?? '';
    const secret = process.env.BINANCE_API_SECRET ?? '';
    this.spot = new Spot({
      configurationRestAPI: {
        apiKey: key,
        apiSecret: secret,
        proxy: BinanceClient.getSystemProxy(),
      }
    });
  }

  static getSystemProxy(): ProxyConfiguration | undefined {
    const proxy = process.env.HTTPS_PROXY
      ?? process.env.https_proxy
      ?? process.env.HTTP_PROXY
      ?? process.env.http_proxy;

    if (!proxy) {
      return undefined;
    }

    try {
      const parsed = new URL(proxy);
      const host = parsed.hostname;
      const port = parsed.port ? Number(parsed.port) : undefined;
      if (!host || !port || Number.isNaN(port)) {
        return undefined;
      }

      const config: ProxyConfiguration = {
        host,
        port,
        protocol: parsed.protocol?.replace(':', ''),
      };

      if (parsed.username && parsed.password) {
        config.auth = {
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
        };
      }

      return config;
    } catch (error) {
      return undefined;
    }
  }

  getSupportedIntervals(): string[] {
    return [...SUPPORTED_INTERVALS];
  }

  getPerpetualMarkets(): PerpetualMarket[] {
    return [...PERPETUAL_MARKETS];
  }

  async subscribeToCandles(options: StreamOptions, handler: SubscriptionHandler): Promise<() => void> {
    const key = BinanceClient.serializeKey(options);
    const stream = await this.ensureStream(key, options);
    return stream.subscribe(handler);
  }

  private async ensureStream(key: string, options: StreamOptions): Promise<CandleStream> {
    const existing = this.streams.get(key);
    if (existing) {
      return existing;
    }
    const candles = await this.cache.resolve(
      { symbol: options.symbol, interval: options.interval, limit: options.limit },
      async () => this.fetchInitialCandles(options.symbol, options.interval, options.limit)
    );
    const stream = new CandleStream(options, candles, this.cache, () => {
      this.streams.delete(key);
    });
    this.streams.set(key, stream);
    return stream;
  }

  private static serializeKey(options: StreamOptions): string {
    return `${options.symbol}:${options.interval}:${options.limit}`;
  }

  private async fetchInitialCandles(symbol: string, interval: string, limit: number): Promise<UnifiedCandle[]> {
    const response = await this.spot.restAPI.klines({ symbol, interval: interval as any, limit });
    const data = await response.data();
    return data.map((entry: (string | number)[]) => BinanceClient.normalize(entry));
  }

  private static normalize(entry: (string | number)[]): UnifiedCandle {
    return [
      Number(entry[0]),
      Number(entry[1]),
      Number(entry[2]),
      Number(entry[3]),
      Number(entry[4]),
      Number(entry[5]),
      Number(entry[6]),
      Number(entry[7]),
      Number(entry[8]),
      Number(entry[9]),
      Number(entry[10]),
    ] as UnifiedCandle;
  }
}

let client: BinanceClient | null = null;

export const getBinanceClient = (): BinanceClient => {
  if (!client) {
    client = new BinanceClient();
  }
  return client;
};
