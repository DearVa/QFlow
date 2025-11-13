<template>
  <div class="chart-panel">
    <div ref="chartContainer" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { createChart, ISeriesApi, LineStyle, type CandlestickData } from 'lightweight-charts';
import { useMarketStore } from '../stores/market';

const chartContainer = ref<HTMLDivElement | null>(null);
const marketStore = useMarketStore();
let candleSeries: ISeriesApi<'Candlestick'> | undefined;
let markersSeries: ISeriesApi<'Line'> | undefined;

const renderMarkers = () => {
  if (!markersSeries) return;
  const markers = marketStore.activeMarkers.map(marker => ({
    time: marker.time as unknown as CandlestickData['time'],
    position: marker.type === 'take-profit' ? 'above' : 'below',
    color: marker.type === 'take-profit' ? '#22c55e' : '#ef4444',
    shape: marker.type === 'take-profit' ? 'arrowDown' : 'arrowUp',
    text: marker.label
  }));
  markersSeries.setMarkers(markers);
};

onMounted(() => {
  if (!chartContainer.value) {
    return;
  }

  const chart = createChart(chartContainer.value, {
    layout: {
      background: { color: '#0b1120' },
      textColor: '#e2e8f0'
    },
    grid: {
      vertLines: { color: '#1e293b' },
      horzLines: { color: '#1e293b' }
    },
    crosshair: {
      mode: 0
    },
    timeScale: {
      borderColor: '#1e293b'
    }
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderUpColor: '#22c55e',
    borderDownColor: '#ef4444',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e'
  });

  markersSeries = chart.addLineSeries({
    color: '#fbbf24',
    lineWidth: 2,
    lineStyle: LineStyle.Dashed
  });

  watch(
    () => marketStore.candles,
    candles => {
      if (candleSeries) {
        candleSeries.setData(candles as CandlestickData[]);
      }
    },
    { immediate: true }
  );

  watch(
    () => marketStore.activeMarkers,
    () => renderMarkers(),
    { immediate: true }
  );

  watch(
    () => marketStore.activeStrategySignals,
    signals => {
      if (!markersSeries) return;
      const lineData = signals.map(signal => ({
        time: signal.time as unknown as CandlestickData['time'],
        value: signal.price
      }));
      markersSeries.setData(lineData);
    },
    { immediate: true }
  );

  const cleanup = () => chart.remove();
  onUnmounted(cleanup);
});
</script>

<style scoped>
.chart-panel {
  flex: 1;
  background: #0b1120;
  border-radius: 12px;
  padding: 0.5rem;
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 420px;
}
</style>
