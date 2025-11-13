import { Spot } from '@binance/connector';

export class BinanceClient {
  private readonly client: Spot;

  constructor() {
    const key = process.env.BINANCE_API_KEY ?? '';
    const secret = process.env.BINANCE_API_SECRET ?? '';
    this.client = new Spot(key, secret, {
      baseURL: process.env.BINANCE_BASE_URL ?? 'https://api.binance.com'
    });
  }

  async getCandles(symbol: string, interval: string, limit = 500): Promise<number[][]> {
    const response = await this.client.klines(symbol, interval, { limit });
    return response.data as number[][];
  }
}
