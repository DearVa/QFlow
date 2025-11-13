<template>
  <div class="relative h-full w-full overflow-hidden rounded-lg border border-slate-900 bg-slate-950">
    <div
      class="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/90 p-2 text-[11px] uppercase tracking-[0.4em] shadow-2xl"
    >
      <p class="px-1 text-[10px] font-semibold text-slate-400">Tools</p>
      <Button
        v-for="tool in tools"
        :key="tool.id"
        size="sm"
        variant="ghost"
        :class="[
          'justify-start text-[11px] font-semibold uppercase tracking-[0.3em]',
          activeTool === tool.id ? 'bg-slate-900 text-white' : 'text-slate-400'
        ]"
        @click="selectTool(tool.id)"
      >
        {{ tool.label }}
      </Button>
      <div class="mt-2 border-t border-slate-900 pt-2">
        <Button
          size="sm"
          variant="ghost"
          class="justify-start text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-300"
          @click="clearDrawings"
        >
          Clear
        </Button>
      </div>
    </div>
    <div ref="chartContainer" class="h-full w-full min-h-[360px]"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  createChart,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time
} from 'lightweight-charts';
import { useMarketStore } from '@/stores/market';
import { Button } from '@/components/ui/button';

const chartContainer = ref<HTMLDivElement | null>(null);
const marketStore = useMarketStore();
let candleSeries: ISeriesApi<'Candlestick'> | undefined;
let markersSeries: ISeriesApi<'Line'> | undefined;
let chartInstance: IChartApi | null = null;
let resizeObserver: ResizeObserver | null = null;

type Tool = 'select' | 'trendline' | 'horizontal';
type Drawing = {
  id: string;
  type: Extract<Tool, 'trendline' | 'horizontal'>;
  series: ISeriesApi<'Line'>;
  points: { time: Time; value: number }[];
};

const activeTool = ref<Tool>('select');
const drawings = ref<Drawing[]>([]);
const pendingPoints = ref<{ time: Time; value: number }[]>([]);

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const tools: { id: Tool; label: string }[] = [
  { id: 'select', label: 'Inspect' },
  { id: 'trendline', label: 'Trend' },
  { id: 'horizontal', label: 'Level' }
];

const selectTool = (tool: Tool) => {
  activeTool.value = tool;
  pendingPoints.value = [];
};

const clearDrawings = () => {
  drawings.value.forEach(drawing => {
    chartInstance?.removeSeries(drawing.series);
  });
  drawings.value = [];
  pendingPoints.value = [];
};

const renderMarkers = () => {
  if (!markersSeries) return;
  const markers: SeriesMarker<Time>[] = marketStore.activeMarkers.map(marker => ({
    time: marker.time as unknown as Time,
    position: marker.type === 'take-profit' ? 'aboveBar' : 'belowBar',
    color: marker.type === 'take-profit' ? '#22c55e' : '#ef4444',
    shape: marker.type === 'take-profit' ? 'arrowDown' : 'arrowUp',
    text: marker.label
  }));
  markersSeries.setMarkers(markers);
};

const refreshHorizontalLines = () => {
  if (!chartInstance || marketStore.candles.length < 2) return;
  const first = marketStore.candles[0].time as Time;
  const last = marketStore.candles[marketStore.candles.length - 1].time as Time;
  drawings.value
    .filter(drawing => drawing.type === 'horizontal')
    .forEach(drawing => {
      const price = drawing.points[0].value;
      drawing.series.setData([
        { time: first, value: price },
        { time: last, value: price }
      ]);
    });
};

const handleChartClick = (param: MouseEventParams) => {
  if (!param.point || !param.time || !candleSeries) return;
  if (activeTool.value === 'select') {
    pendingPoints.value = [];
    return;
  }

  const price = candleSeries.coordinateToPrice(param.point.y);
  if (price == null) return;
  const normalizedPrice = Number(price);

  if (activeTool.value === 'trendline') {
    pendingPoints.value = [...pendingPoints.value, { time: param.time as Time, value: normalizedPrice }];
    if (pendingPoints.value.length === 2 && chartInstance) {
      const series = chartInstance.addLineSeries({
        color: '#cbd5f5',
        lineWidth: 2,
        lineStyle: LineStyle.Solid
      });
      series.setData(pendingPoints.value);
      drawings.value = [
        ...drawings.value,
        {
          id: createId(),
          type: 'trendline',
          series,
          points: pendingPoints.value
        }
      ];
      pendingPoints.value = [];
      activeTool.value = 'select';
    }
  }

  if (activeTool.value === 'horizontal' && chartInstance) {
    const series = chartInstance.addLineSeries({
      color: '#64748b',
      lineWidth: 1,
      lineStyle: LineStyle.Solid
    });
    const first = (marketStore.candles[0]?.time ?? param.time) as Time;
    const last = (marketStore.candles[marketStore.candles.length - 1]?.time ?? param.time) as Time;
    const horizontalPoints = [
      { time: first, value: normalizedPrice },
      { time: last, value: normalizedPrice }
    ];
    series.setData(horizontalPoints);
    drawings.value = [
      ...drawings.value,
      {
        id: createId(),
        type: 'horizontal',
        series,
        points: horizontalPoints
      }
    ];
    activeTool.value = 'select';
  }
};

onMounted(() => {
  if (!chartContainer.value) {
    return;
  }

  chartInstance = createChart(chartContainer.value, {
    layout: {
      background: { color: '#020617' },
      textColor: '#cbd5f5'
    },
    grid: {
      vertLines: { color: '#111827' },
      horzLines: { color: '#111827' }
    },
    crosshair: {
      mode: 0
    },
    timeScale: {
      borderColor: '#1f2937'
    }
  });

  candleSeries = chartInstance.addCandlestickSeries({
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderUpColor: '#22c55e',
    borderDownColor: '#ef4444',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e'
  });

  markersSeries = chartInstance.addLineSeries({
    color: '#94a3b8',
    lineWidth: 2,
    lineStyle: LineStyle.Dashed
  });

  chartInstance.subscribeClick(handleChartClick);

  resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0];
    if (entry) {
      chartInstance?.resize(entry.contentRect.width, entry.contentRect.height);
    }
  });

  resizeObserver.observe(chartContainer.value);

  watch(
    () => marketStore.candles,
    candles => {
      if (candleSeries) {
        candleSeries.setData(candles as CandlestickData[]);
      }
      refreshHorizontalLines();
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
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

onUnmounted(() => {
  chartInstance?.unsubscribeClick(handleChartClick);
  chartInstance?.remove();
});
</script>
