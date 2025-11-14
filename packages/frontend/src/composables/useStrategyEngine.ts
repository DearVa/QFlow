import axios from 'axios';
import type { CompiledStrategy, StrategyMetric } from '@/types/strategy';

interface Marker {
  time: number;
  type: 'take-profit' | 'stop-loss';
  label: string
}

interface Signal {
  time: number;
  price: number
}

interface BacktestResult {
  markers: Marker[];
  signals: Signal[];
  metrics: StrategyMetric[];
}

export const useStrategyEngine = () => {
  const runBacktest = async (
    compiled: CompiledStrategy,
    symbol: string,
    interval: string
  ): Promise<BacktestResult> => {
    const { data } = await axios.post('/api/strategy/backtest', {
      strategy: compiled,
      symbol,
      interval
    });
    return data;
  };

  return { runBacktest };
};
