import WebSocket from "ws";
import type { FastifyRequest } from 'fastify';

export const strategySocket = (ws: WebSocket.WebSocket, req: FastifyRequest) => {
  ws.send(JSON.stringify({ type: 'connected' }));

  ws.on('message', data => {
    ws.send(JSON.stringify({ type: 'echo', payload: data.toString() }));
  });
};
