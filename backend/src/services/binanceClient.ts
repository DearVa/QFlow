import axios from 'axios';

export class BinanceClient {
  private readonly http = axios.create({
    baseURL: 'https://api.binance.com'
  });

  async getCandles(symbol: string, interval: string, limit = 500): Promise<number[][]> {
    const { data } = await this.http.get('/api/v3/klines', {
      params: { symbol, interval, limit }
    });
    return data;
  }
}
