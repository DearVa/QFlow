import type { Server } from 'http';
import { WebSocketServer } from 'ws';
import { getBinanceClient } from '../services/binanceClient';
import type { MarketSnapshotPayload, MarketUpdatePayload } from '../services/types';

interface SubscribeMessage {
  type: 'subscribe';
  symbol: string;
  interval: string;
  limit?: number;
}

interface IntervalMessage {
  type: 'getIntervals';
}

interface PerpetualMessage {
  type: 'getPerpetuals';
}

type ClientMessage = SubscribeMessage | IntervalMessage | PerpetualMessage;

type StreamPayload = MarketSnapshotPayload | MarketUpdatePayload;

const marketClient = getBinanceClient();

export const attachMarketSocket = (server: Server): void => {
  const wss = new WebSocketServer({ server, path: '/market-stream' });

  wss.on('connection', ws => {
    let unsubscribe: (() => void) | null = null;

    const emitMetadata = () => {
      ws.send(JSON.stringify({ type: 'intervals', payload: marketClient.getSupportedIntervals() }));
      ws.send(JSON.stringify({ type: 'perpetuals', payload: marketClient.getPerpetualMarkets() }));
    };

    emitMetadata();

    const handleStreamPayload = (payload: StreamPayload) => {
      ws.send(JSON.stringify({ type: payload.type, payload }));
    };

    const handleMessage = async (raw: Buffer) => {
      try {
        const message = JSON.parse(raw.toString()) as ClientMessage;
        if (message.type === 'subscribe') {
          const { symbol, interval, limit = 500 } = message;
          unsubscribe?.();
          unsubscribe = await marketClient.subscribeToCandles(
            { symbol, interval, limit },
            { handle: handleStreamPayload }
          );
          return;
        }
        if (message.type === 'getIntervals') {
          ws.send(JSON.stringify({ type: 'intervals', payload: marketClient.getSupportedIntervals() }));
          return;
        }
        if (message.type === 'getPerpetuals') {
          ws.send(JSON.stringify({ type: 'perpetuals', payload: marketClient.getPerpetualMarkets() }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message payload' }));
      }
    };

    ws.on('message', handleMessage);

    ws.on('close', () => {
      unsubscribe?.();
      unsubscribe = null;
    });
  });
};
