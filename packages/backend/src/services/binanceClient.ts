import type { PerpetualMarketSymbol, UnifiedCandle } from '@qflow/shared/types';
import type { IMarketClient, StreamOptions, SubscriptionHandler } from '@/market';
import { Spot, SPOT_WS_STREAMS_PROD_URL } from '@binance/spot';
import { URL } from 'url';

interface ProxyConfiguration {
  host: string;
  port: number;
  protocol?: string;
  auth?: {
    username: string;
    password: string;
  };
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

const PERPETUAL_MARKETS: PerpetualMarketSymbol[] = [
  { symbol: 'BTCUSDT', label: 'BTC / USDT', description: 'Bitcoin perpetual' },
  { symbol: 'ETHUSDT', label: 'ETH / USDT', description: 'Ethereum perpetual' },
  { symbol: 'BNBUSDT', label: 'BNB / USDT', description: 'BNB perpetual' },
  { symbol: 'SOLUSDT', label: 'SOL / USDT', description: 'Solana perpetual' }
];

class BinanceClient implements IMarketClient {
  private readonly spot: Spot;

  constructor() {
    const apiKey = process.env.BINANCE_API_KEY ?? '';
    const apiSecret = process.env.BINANCE_API_SECRET ?? '';
    const proxy = BinanceClient.getSystemProxy();
    this.spot = new Spot({
      configurationRestAPI: {
        apiKey,
        apiSecret,
        proxy,
      },
      configurationWebsocketAPI: {
        apiKey,
        apiSecret,
        wsURL: SPOT_WS_STREAMS_PROD_URL
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

  getPerpetualMarkets(): PerpetualMarketSymbol[] {
    return [...PERPETUAL_MARKETS];
  }

  async getCandles(symbol: string, interval: string, limit: number): Promise<UnifiedCandle[]> {
    const response = await this.spot.restAPI.klines({ symbol, interval: interval as any, limit });
    const data = await response.data();
    return data.map((entry: (string | number)[]) => BinanceClient.normalize(entry));
  }

  async subscribeToCandles(options: StreamOptions, handler: SubscriptionHandler): Promise<() => void> {
    const { symbol, interval, limit } = options;

    // 1. Fetch initial snapshot
    const initialCandles = await this.getCandles(symbol, interval, limit);
    handler.handle({
      type: 'snapshot',
      symbol,
      interval,
      candles: initialCandles,
    });

    // 2. Subscribe to WebSocket stream for updates
    const connection = await this.spot.websocketStreams.connect();
    const stream = connection.kline({
      symbol,
      interval: interval as any,
    });
    stream.on('message', data => {
      console.log(`Received ${data}`);

      if (!data.k) return;

      const candle: UnifiedCandle = [
        Number(data.k.t),
        Number(data.k.o),
        Number(data.k.h),
        Number(data.k.l),
        Number(data.k.c),
        Number(data.k.v),
        Number(data.k.T),
        Number(data.k.q),
        Number(data.k.v),
        Number(data.k.Q),
        Number(data.k.V),
      ];
      handler.handle({
        type: 'update',
        symbol,
        interval,
        candle,
      });
    });

    return () => {
      connection.disconnect();
    };
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

let client: IMarketClient | null = null;

export const getBinanceClient = (): IMarketClient => {
  if (!client) {
    client = new BinanceClient();
  }
  return client;
};
