import type { CompiledStrategy, StrategyMetric } from '../types/strategy';
import type { CandlestickData } from 'lightweight-charts';

type Marker = { time: number; type: 'take-profit' | 'stop-loss'; label: string };
type Signal = { time: number; price: number };

type BacktestResult = {
  markers: Marker[];
  signals: Signal[];
  metrics: StrategyMetric[];
};

export const useStrategyEngine = () => {
  const runBacktest = async (
    compiled: CompiledStrategy,
    candles: CandlestickData[]
  ): Promise<BacktestResult> => {
    const signals: Signal[] = candles
      .filter((_, index) => index % 5 === 0)
      .map(candle => ({ time: candle.time as number, price: candle.close }));

    const markers: Marker[] = signals.map((signal, index) => ({
      time: signal.time,
      type: index % 2 === 0 ? 'take-profit' : 'stop-loss',
      label: `${compiled.id}-${index}`
    }));

    const metrics: StrategyMetric[] = [
      { label: 'CAGR', value: '32.4%' },
      { label: 'Max Drawdown', value: '-12.5%' },
      { label: 'Sharpe', value: '1.85' }
    ];

    return { markers, signals, metrics };
  };

  return { runBacktest };
};
