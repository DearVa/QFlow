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

  const setSymbol = (next: string) => {
    symbol.value = next;
    loadCandles();
  };

  const loadCandles = async () => {
    candles.value = await fetchMarketCandles(symbol.value, interval.value);
  };

  void loadCandles();

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
    fetchCandles: loadCandles,
    compileStrategy,
    activateStrategy
  };
});
