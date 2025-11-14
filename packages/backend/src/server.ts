import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import marketRouter from '@/routes/market';
import strategyRouter from '@/routes/strategy';
import { marketSocket } from '@/websocket/marketSocket';
import { strategySocket } from '@/websocket/strategySocket';

const app = fastify({ logger: true });

app.register(fastifyCors);
app.register(fastifyWebsocket);

app.register(marketRouter, { prefix: '/api/market' });
app.register(strategyRouter, { prefix: '/api/strategy' });

app.register(async function (fastify) {
  fastify.get('/stream/market', { websocket: true }, marketSocket);
  fastify.get('/stream/strategy', { websocket: true }, strategySocket);
});

const start = async () => {
  try {
    const port = process.env.PORT || 8081;
    await app.listen({ port: Number(port), host: '0.0.0.0' });
    console.log(`API ready on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();