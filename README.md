# QFlow

QFlow is an experimental visual quant platform built with Vue 3 (front-end) and a lightweight Node.js/Express back-end. It focuses on:

- PWA ready dashboard that displays Binance candlesticks using `lightweight-charts`
- Node-editor inspired strategy authoring surface (Rete powered) that can compile to TypeScript code
- Server side APIs that proxy Binance data, compile strategy graphs and broadcast live signals via WebSocket

## Project layout

```
QFlow/
├── frontend/        # Vue + Vite PWA client
│   ├── src/components
│   ├── src/stores
│   └── ...
└── backend/         # Express + TypeScript API server
    ├── src/routes
    ├── src/services
    └── src/strategy
```

## Getting started

### Front-end

```bash
cd frontend
npm install
npm run dev
```

Vite dev server is available at `http://localhost:4173` and proxies API requests to the back-end.

### Back-end

```bash
cd backend
npm install
npm run dev
```

The API exposes:

- `GET /api/market/candles` – Binance candles proxy
- `POST /api/strategy/compile` – turn node graph into executable metadata
- `POST /api/strategy/backtest` – basic toy backtest returning mock metrics

The WebSocket stream lives at `ws://localhost:8080/strategy-stream`.

## Next steps

- Replace the mock strategy compiler/backtest engine with production ready logic
- Persist strategies per user and allow server-side execution
- Harden the node editor UX (custom nodes, connectors, validation)
- Add authentication and encrypted secret storage for API keys
