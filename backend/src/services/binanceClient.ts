// @ts-ignore
import { Spot } from '@binance/spot';

export class BinanceClient {
  private readonly spot: Spot;

  constructor() {
    const key = process.env.BINANCE_API_KEY ?? '';
    const secret = process.env.BINANCE_API_SECRET ?? '';
    this.spot = new Spot({
      configurationRestAPI: {
        apiKey: key,
        apiSecret: secret,
        proxy: getSystemProxy(),
      }
    });
  }


  static getSystemProxy() {
    // TODO: get system proxy settings
    // proxy: {
    //   host: '127.0.0.1',
    //       port: 7897,
    //       protocol: 'http',
    // },
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
