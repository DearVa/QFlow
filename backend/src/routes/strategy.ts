import { Router } from 'express';
import { z } from 'zod';
import { StrategyEngine } from '../strategy/engine';

const router = Router();
const engine = new StrategyEngine();

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

router.post('/backtest', async (req, res) => {
  try {
    const { strategy, candles } = req.body;
    const result = await engine.backtest(strategy, candles ?? []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Unable to backtest strategy' });
  }
});

export default router;
