import { z } from 'zod';
import { StrategyEngine, StrategyPayload } from '@/strategy/engine';
import { getBinanceClient } from '@/services/binanceClient';
import type { FastifyInstance } from 'fastify';

const engine = new StrategyEngine();
const marketClient = getBinanceClient();

const strategySchema = z.object({
  id: z.string(),
  code: z.string(),
  nodes: z.any()
});

const backtestSchema = z.object({
  strategy: strategySchema,
  symbol: z.string().min(1),
  interval: z.string().min(1),
  lookback: z.number().int().min(100).max(1000).optional()
});

export default async function strategyRouter(fastify: FastifyInstance) {
  fastify.post('/compile', (request, reply) => {
    const parsed = strategySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid payload' });
    }
    const compiled = engine.compile(parsed.data as StrategyPayload);
    reply.send(compiled);
  });

  fastify.post('/backtest', async (request, reply) => {
    const parsed = backtestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid payload' });
    }

    try {
      const { strategy, symbol, interval, lookback = 500 } = parsed.data;
      const candles = await marketClient.getCandles(symbol, interval, lookback);
      const result = await engine.backtest(strategy as StrategyPayload, candles);
      reply.send(result);
    } catch (error) {
      console.error('[backtest] failed', error);
      reply.status(500).send({ message: 'Unable to backtest strategy' });
    }
  });
}
