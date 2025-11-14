import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { CandlestickData, Time } from 'lightweight-charts';
import type { PerpetualMarketSymbol, MarketServerMessage, MarketSnapshotPayload, MarketUpdatePayload } from '@qflow/shared/types';
import { useMarketSocket } from '@/services/market';
import type { StrategyNodeGraph, CompiledStrategy, StrategyMetric } from '@/types/strategy';
import { buildStrategyFromNodes } from '@/services/strategy';
import { useStrategyEngine } from '@/composables/useStrategyEngine';

const MAX_CANDLES = 500;

const toCandlestick = (payload: MarketSnapshotPayload['candles'][number]): CandlestickData => ({
  time: (payload[0] / 1000) as Time,
  open: Number(payload[1]),
  high: Number(payload[2]),
  low: Number(payload[3]),
  close: Number(payload[4])
});

export const useMarketStore = defineStore('market', () => {
  const symbol = ref('BTCUSDT');
  const colors = ref({
    upColor: '#ef4444',
    borderUpColor: '#b91c1c',
    wickUpColor: '#b91c1c',
    downColor: '#22c55e',
    borderDownColor: '#15803d',
    wickDownColor: '#15803d',
  });
  const interval = ref('1h');
  const candles = ref<CandlestickData[]>([]);
  const supportedIntervals = ref<string[]>(['1h']);
  const perpetualSymbols = ref<PerpetualMarketSymbol[]>([]);
  const activeMarkers = ref<{ time: number; type: 'take-profit' | 'stop-loss'; label: string }[]>([]);
  const activeStrategySignals = ref<{ time: number; price: number }[]>([]);
  const metrics = ref<StrategyMetric[]>([
    { label: 'CAGR', value: '-' },
    { label: 'Max Drawdown', value: '-' },
    { label: 'Sharpe', value: '-' },
  ]);
  const strategyEngine = useStrategyEngine();

  const marketSocket = useMarketSocket();

  const isLoaded = computed(() => candles.value.length > 0);

  const reconcileSnapshot = (snapshot: MarketSnapshotPayload) => {
    if (snapshot.symbol !== symbol.value || snapshot.interval !== interval.value) {
      return;
    }
    candles.value = snapshot.candles.map(toCandlestick);
  };

  const reconcileUpdate = (update: MarketUpdatePayload) => {
    if (update.symbol !== symbol.value || update.interval !== interval.value) {
      return;
    }
    const next = toCandlestick(update.candle);
    const existingIndex = candles.value.findIndex(entry => entry.time === next.time);
    if (existingIndex >= 0) {
      candles.value[existingIndex] = next;
    } else {
      candles.value.push(next);
      if (candles.value.length > MAX_CANDLES) {
        candles.value.shift();
      }
    }
  };

  const handleServerMessage = (message: MarketServerMessage) => {
    if (message.type === 'snapshot') {
      reconcileSnapshot(message.payload);
      return;
    }
    if (message.type === 'update') {
      reconcileUpdate(message.payload);
      return;
    }
    if (message.type === 'intervals') {
      supportedIntervals.value = message.payload;
      return;
    }
    if (message.type === 'perpetuals') {
      perpetualSymbols.value = message.payload;
    }
  };

  if (marketSocket) {
    marketSocket.refreshMetadata();
    marketSocket.onMessage(handleServerMessage);
    marketSocket.subscribeToCandles(symbol.value, interval.value, MAX_CANDLES);
  }

  watch(symbol, () => {
    if (marketSocket) {
      marketSocket.subscribeToCandles(symbol.value, interval.value, MAX_CANDLES);
    }
  });

  watch(interval, () => {
    if (marketSocket) {
      marketSocket.subscribeToCandles(symbol.value, interval.value, MAX_CANDLES);
    }
  });

  watch(supportedIntervals, newIntervals => {
    if (newIntervals.length > 0 && !newIntervals.includes(interval.value)) {
      interval.value = newIntervals[0];
    }
  });

  watch(perpetualSymbols, newSymbols => {
    if (newSymbols.length > 0 && !newSymbols.some(entry => entry.symbol === symbol.value)) {
      symbol.value = newSymbols[0].symbol;
    }
  });

  const compileStrategy = async (graph: StrategyNodeGraph): Promise<CompiledStrategy> => {
    return buildStrategyFromNodes(graph);
  };

  const activateStrategy = async (compiled: CompiledStrategy) => {
    const results = await strategyEngine.runBacktest(compiled, symbol.value, interval.value);
    activeMarkers.value = results.markers;
    activeStrategySignals.value = results.signals;
    metrics.value = results.metrics;
  };

  return {
    symbol,
    colors,
    interval,
    supportedIntervals,
    candles,
    isLoaded,
    activeMarkers,
    activeStrategySignals,
    metrics,
    perpetualSymbols,
    compileStrategy,
    activateStrategy,
  };
});
