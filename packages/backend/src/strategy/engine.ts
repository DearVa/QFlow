import { SMA } from 'technicalindicators';
import { UnifiedCandle, UCIdx } from '@qflow/shared/types';

export interface StrategyPayload {
  id: string;
  code: string;
  nodes: unknown;
}

interface StrategyConfig {
  shortPeriod: number;
  longPeriod: number;
  takeProfitPct: number;
  stopLossPct: number;
}

interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  label: string;
  exitType: 'take-profit' | 'stop-loss' | 'signal';
}

const DEFAULT_CONFIG: StrategyConfig = {
  shortPeriod: 9,
  longPeriod: 26,
  takeProfitPct: 0.03,
  stopLossPct: 0.015
};

export class StrategyEngine {
  compile(payload: StrategyPayload) {
    return {
      ...payload,
      compiledAt: new Date().toISOString()
    };
  }

  async backtest(strategy: StrategyPayload, candles: UnifiedCandle[]) {
    if (candles.length < DEFAULT_CONFIG.longPeriod) {
      throw new Error('Not enough candles to backtest');
    }

    const config = this.resolveConfig(strategy.nodes);
    const trades = this.simulateTrades(candles, config, strategy.id);
    const summary = this.calculateMetrics(trades, candles);
    const toUnixSeconds = (value: number) => Math.floor(value / 1000);
    const exitTrades = trades.filter(
      (trade): trade is Trade & { exitType: 'take-profit' | 'stop-loss' } => trade.exitType !== 'signal'
    );

    return {
      strategyId: strategy.id,
      markers: exitTrades.map(trade => ({
        time: toUnixSeconds(trade.exitTime),
        type: trade.exitType,
        label: trade.label
      })),
      signals: trades.flatMap(trade => [
        { time: toUnixSeconds(trade.entryTime), price: trade.entryPrice },
        { time: toUnixSeconds(trade.exitTime), price: trade.exitPrice }
      ]),
      metrics: summary
    };
  }

  private resolveConfig(nodes: unknown): StrategyConfig {
    const extracted =
      typeof nodes === 'object' && nodes !== null && 'config' in nodes
        ? (nodes as Record<string, any>).config
        : nodes;

    const parseNumber = (value: unknown, fallback: number) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };

    return {
      shortPeriod: Math.max(3, Math.floor(parseNumber(extracted?.shortPeriod, DEFAULT_CONFIG.shortPeriod))),
      longPeriod: Math.max(5, Math.floor(parseNumber(extracted?.longPeriod, DEFAULT_CONFIG.longPeriod))),
      takeProfitPct: Math.max(0.001, parseNumber(extracted?.takeProfitPct, DEFAULT_CONFIG.takeProfitPct)),
      stopLossPct: Math.max(0.001, parseNumber(extracted?.stopLossPct, DEFAULT_CONFIG.stopLossPct))
    };
  }

  private simulateTrades(candles: UnifiedCandle[], config: StrategyConfig, strategyId: string): Trade[] {
    const closes = candles.map(c => c[UCIdx.Close]);
    const shortSeries = SMA.calculate({ period: config.shortPeriod, values: closes });
    const longSeries = SMA.calculate({ period: config.longPeriod, values: closes });
    const offsetShort = config.shortPeriod - 1;
    const offsetLong = config.longPeriod - 1;
    const startIndex = Math.max(offsetShort, offsetLong);
    const trades: Trade[] = [];
    let position: { entryPrice: number; entryTime: number } | null = null;
    let tradeCounter = 0;

    for (let index = startIndex; index < candles.length; index++) {
      const candle = candles[index];
      const short = shortSeries[index - offsetShort];
      const long = longSeries[index - offsetLong];
      if (short === undefined || long === undefined) {
        continue;
      }

      if (!position && short > long) {
        position = { entryPrice: candle[UCIdx.Close], entryTime: candle[UCIdx.OpenTime] };
        continue;
      }

      if (!position) {
        continue;
      }

      const takeProfitPrice = position.entryPrice * (1 + config.takeProfitPct);
      const stopLossPrice = position.entryPrice * (1 - config.stopLossPct);
      const exitBySignal = short < long;
      let exitPrice: number | null = null;
      let exitType: Trade['exitType'] = 'signal';

      if (candle[UCIdx.High] >= takeProfitPrice) {
        exitPrice = takeProfitPrice;
        exitType = 'take-profit';
      } else if (candle[UCIdx.Low] <= stopLossPrice) {
        exitPrice = stopLossPrice;
        exitType = 'stop-loss';
      } else if (exitBySignal) {
        exitPrice = candle[UCIdx.Close];
      }

      if (exitPrice !== null) {
        const pnl = (exitPrice - position.entryPrice) / position.entryPrice;
        trades.push({
          entryPrice: position.entryPrice,
          exitPrice,
          entryTime: position.entryTime,
          exitTime: candle[UCIdx.OpenTime],
          pnl,
          label: `${strategyId}-${tradeCounter++}`,
          exitType
        });
        position = null;
      }
    }

    return trades;
  }

  private calculateMetrics(trades: Trade[], candles: UnifiedCandle[]) {
    if (trades.length === 0) {
      return [
        { label: 'Total Return', value: '0%' },
        { label: 'CAGR', value: '0%' },
        { label: 'Max Drawdown', value: '0%' },
        { label: 'Sharpe', value: '0' },
        { label: 'Win Rate', value: '0%' },
        { label: 'Profit Factor', value: '0' }
      ];
    }

    const equityCurve: number[] = [];
    let equity = 1;
    for (const trade of trades) {
      equity *= 1 + trade.pnl;
      equityCurve.push(equity);
    }

    const totalReturn = equity - 1;
    const startTime = candles[0][UCIdx.OpenTime];
    const endTime = candles[candles.length - 1][UCIdx.OpenTime];
    const years = Math.max((endTime - startTime) / (365 * 24 * 60 * 60 * 1000), 1 / 365);
    const cagr = Math.pow(1 + totalReturn, 1 / years) - 1;

    let peak = equityCurve[0];
    let maxDrawdown = 0;
    for (const value of equityCurve) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const returns = trades.map(trade => trade.pnl);
    const mean = returns.reduce((acc, value) => acc + value, 0) / returns.length;
    const variance =
      returns.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / Math.max(returns.length - 1, 1);
    const stdDev = Math.sqrt(Math.max(variance, 0));
    const sharpe = stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252);

    const wins = returns.filter(r => r > 0);
    const losses = returns.filter(r => r <= 0);
    const winRate = wins.length / returns.length;
    const grossProfit = wins.reduce((sum, value) => sum + value, 0);
    const grossLoss = losses.reduce((sum, value) => sum + Math.abs(value), 0);
    const profitFactor = grossLoss === 0 ? grossProfit || 0 : grossProfit / grossLoss;

    const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
    const formatDecimal = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : '∞');

    return [
      { label: 'Total Return', value: formatPercent(totalReturn) },
      { label: 'CAGR', value: formatPercent(cagr) },
      { label: 'Max Drawdown', value: formatPercent(-maxDrawdown) },
      { label: 'Sharpe', value: formatDecimal(sharpe) },
      { label: 'Win Rate', value: formatPercent(winRate) },
      { label: 'Profit Factor', value: formatDecimal(profitFactor) }
    ];
  }
}
