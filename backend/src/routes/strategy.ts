import { Router } from 'express';
import { z } from 'zod';
import { StrategyEngine } from '../strategy/engine';
import { BinanceClient } from '../services/binanceClient';
import type { Candlestick } from '../types';

const router = Router();
const engine = new StrategyEngine();
const binance = new BinanceClient();

const strategySchema = z.object({
  id: z.string(),
  code: z.string(),
  nodes: z.any()
});

router.post('/compile', (req, res) => {
  const parsed = strategySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' });
  }
  const compiled = engine.compile(parsed.data);
  res.json(compiled);
});

const backtestSchema = z.object({
  strategy: strategySchema,
  symbol: z.string().min(1),
  interval: z.string().min(1),
  lookback: z.number().int().min(100).max(1000).optional()
});

router.post('/backtest', async (req, res) => {
  const parsed = backtestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  try {
    const { strategy, symbol, interval, lookback = 500 } = parsed.data;
    const rawCandles = await binance.getCandles(symbol, interval, lookback);
    const candles: Candlestick[] = rawCandles.map(candle => ({
      openTime: Number(candle[0]),
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5])
    }));
    const result = await engine.backtest(strategy, candles);
    res.json(result);
  } catch (error) {
    console.error('[backtest] failed', error);
    res.status(500).json({ message: 'Unable to backtest strategy' });
  }
});

export default router;
