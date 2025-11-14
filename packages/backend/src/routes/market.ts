import type { FastifyInstance } from 'fastify';
import { getBinanceClient } from '@/services/binanceClient';

const client = getBinanceClient();

export default async function marketRouter(fastify: FastifyInstance) {
  fastify.get('/intervals', (req, reply) => {
    reply.send({ intervals: client.getSupportedIntervals() });
  });

  fastify.get('/perpetuals', (req, reply) => {
    reply.send({ symbols: client.getPerpetualMarkets() });
  });
}
