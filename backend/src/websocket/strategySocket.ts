import type { Server } from 'http';
import { WebSocketServer } from 'ws';

export const attachStrategySocket = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/strategy-stream' });

  wss.on('connection', ws => {
    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('message', data => {
      ws.send(JSON.stringify({ type: 'echo', payload: data.toString() }));
    });
  });
};
