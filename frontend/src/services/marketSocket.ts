import type { MarketServerMessage } from '@/types/market';

const resolveSocketUrl = (): string | null => {
  if (import.meta.env.VITE_MARKET_WS_URL) {
    return import.meta.env.VITE_MARKET_WS_URL;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/market-stream`;
};

type MessageHandler = (message: MarketServerMessage) => void;

interface SubscriptionState {
  symbol: string;
  interval: string;
  limit: number;
}

class MarketSocket {
  private ws: WebSocket | null = null;
  private readonly handlers = new Set<MessageHandler>();
  private readonly pendingMessages: object[] = [];
  private subscription: SubscriptionState | null = null;
  private reconnectHandle: number | null = null;
  private readonly url: string | null;

  constructor() {
    this.url = resolveSocketUrl();
    this.connect();
  }

  private connect() {
    if (!this.url) {
      return;
    }
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('open', () => {
      this.flushQueue();
      if (this.subscription) {
        this.send({ type: 'subscribe', ...this.subscription });
      }
    });
    this.ws.addEventListener('message', event => {
      try {
        const payload = JSON.parse(event.data) as MarketServerMessage;
        this.handlers.forEach(handler => handler(payload));
      } catch (error) {
        console.error('Failed to parse market stream payload', error);
      }
    });
    this.ws.addEventListener('close', () => {
      this.scheduleReconnect();
    });
    this.ws.addEventListener('error', () => {
      this.ws?.close();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectHandle) {
      return;
    }
    this.reconnectHandle = window.setTimeout(() => {
      this.reconnectHandle = null;
      this.connect();
    }, 1_000);
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    while (this.pendingMessages.length > 0) {
      const payload = this.pendingMessages.shift();
      if (payload) {
        this.ws.send(JSON.stringify(payload));
      }
    }
  }

  private send(payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return;
    }
    this.pendingMessages.push(payload);
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  subscribeToCandles(symbol: string, interval: string, limit = 500): void {
    this.subscription = { symbol, interval, limit };
    this.send({ type: 'subscribe', symbol, interval, limit });
  }

  refreshMetadata(): void {
    this.send({ type: 'getIntervals' });
    this.send({ type: 'getPerpetuals' });
  }
}

let singleton: MarketSocket | null = null;

export const useMarketSocket = (): MarketSocket | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!singleton) {
    singleton = new MarketSocket();
  }
  return singleton;
};
