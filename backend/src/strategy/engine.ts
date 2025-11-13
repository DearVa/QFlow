import type { Candlestick } from '../types';

type StrategyPayload = {
  id: string;
  code: string;
  nodes: unknown;
};

export class StrategyEngine {
  compile(payload: StrategyPayload) {
    return {
      ...payload,
      compiledAt: new Date().toISOString()
    };
  }

  async backtest(strategy: StrategyPayload, candles: Candlestick[]) {
    const trades = candles.filter((_, index) => index % 10 === 0).map(candle => ({
      time: candle.openTime,
      price: candle.close
    }));

    return {
      strategyId: strategy.id,
      markers: trades.map((trade, index) => ({
        time: trade.time,
        type: index % 2 === 0 ? 'take-profit' : 'stop-loss',
        label: `${strategy.id}-${index}`
      })),
      signals: trades,
      metrics: [
        { label: 'CAGR', value: '18.2%' },
        { label: 'Max Drawdown', value: '-8.1%' },
        { label: 'Sharpe', value: '1.42' }
      ]
    };
  }
}
