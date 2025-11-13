import { Spot } from '@binance/spot';
import { URL } from 'url';

interface ProxyConfiguration {
  host: string;
  port: number;
  protocol?: string;
  auth?: {
    username: string;
    password: string;
  };
};

export class BinanceClient {
  private readonly spot: Spot;

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

  async getCandles(symbol: string, interval: string, limit = 500): Promise<number[][]> {
    const response = await this.spot.restAPI.klines({
      symbol,
      interval: interval as any,
      limit
    });
    const data = await response.data();
    return data.map(c1 => c1.map(v => (typeof v === 'string' ? parseFloat(v) : v)));
  }
}
