import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CandlestickData } from 'lightweight-charts';
import { fetchCandles as fetchMarketCandles } from '../services/binance';
import type { StrategyNodeGraph, CompiledStrategy, StrategyMetric } from '@/types/strategy';
import { buildStrategyFromNodes } from '@/services/strategy';
import { useStrategyEngine } from '@/composables/useStrategyEngine';

export const useMarketStore = defineStore('market', () => {
  const symbol = ref('BTCUSDT');
  const interval = ref('1h');
  const intervalDurations: Record<string, number> = {
    '1s': 1000,
    '1m': 60_000,
    '3m': 180_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '2h': 7_200_000,
    '4h': 14_400_000,
    '6h': 21_600_000,
    '8h': 28_800_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
    '3d': 259_200_000,
    '1w': 604_800_000,
    '1M': 2_592_000_000
  };
  const candles = ref<CandlestickData[]>([]);
  const activeMarkers = ref<{ time: number; type: 'take-profit' | 'stop-loss'; label: string }[]>([]);
  const activeStrategySignals = ref<{ time: number; price: number }[]>([]);
  const metrics = ref<StrategyMetric[]>([
    { label: 'CAGR', value: '-' },
    { label: 'Max Drawdown', value: '-' },
    { label: 'Sharpe', value: '-' }
  ]);
  const strategyEngine = useStrategyEngine();

  const isLoaded = computed(() => candles.value.length > 0);

  const resolveRefreshDuration = (frame: string) => intervalDurations[frame] ?? 60_000;

  let refreshHandle: ReturnType<typeof setInterval> | null = null;

  const scheduleAutoRefresh = () => {
    if (refreshHandle) {
      clearInterval(refreshHandle);
    }
    refreshHandle = setInterval(() => {
      void loadCandles();
    }, resolveRefreshDuration(interval.value));
  };

  const setSymbol = (next: string) => {
    if (symbol.value === next) {
      return;
    }
    symbol.value = next;
    void loadCandles();
  };

  const setIntervalFrame = (next: string) => {
    if (interval.value === next) {
      return;
    }
    interval.value = next;
    void loadCandles();
    scheduleAutoRefresh();
  };

  const loadCandles = async () => {
    candles.value = await fetchMarketCandles(symbol.value, interval.value);
  };

  void (async () => {
    await loadCandles();
    scheduleAutoRefresh();
  })();

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
    interval,
    candles,
    isLoaded,
    activeMarkers,
    activeStrategySignals,
    metrics,
    setSymbol,
    setIntervalFrame,
    fetchCandles: loadCandles,
    compileStrategy,
    activateStrategy,
    scheduleAutoRefresh
  };
});
