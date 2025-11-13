import axios from 'axios';
import type { CandlestickData } from 'lightweight-charts';

export const fetchCandles = async (symbol: string, interval: string, signal?: AbortSignal): Promise<CandlestickData[]> => {
  const { data } = await axios.get(`/api/market/candles`, { params: { symbol, interval }, signal });
  return data.map((candle: number[]) => ({
    time: candle[0] / 1000,
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4])
  }));
};
