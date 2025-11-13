<template>
  <div class="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card/70">
    <TooltipProvider>
      <div
        class="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-full border border-border/50 bg-background/70 p-2 shadow-xl backdrop-blur"
      >
        <Tooltip v-for="tool in tools" :key="tool.id">
          <TooltipTrigger as-child>
            <Button
              size="icon"
              variant="ghost"
              :class="[
                'size-9 rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground',
                activeTool === tool.id && 'bg-primary/10 text-primary'
              ]"
              @click="selectTool(tool.id)"
            >
              <component :is="tool.icon" class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p class="text-xs font-medium">{{ tool.label }}</p>
          </TooltipContent>
        </Tooltip>
        <div class="h-px bg-border/60" />
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon"
              variant="ghost"
              class="size-9 rounded-full text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
              @click="clearDrawings"
            >
              <Eraser class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p class="text-xs font-medium">Clear drawings</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
    <div ref="chartContainer" class="h-full w-full min-h-[360px]"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch, type Component } from 'vue';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eraser, Minus, Pointer, TrendingUp } from 'lucide-vue-next';

const chartContainer = ref<HTMLDivElement | null>(null);
const marketStore = useMarketStore();
let candleSeries: ISeriesApi<'Candlestick'> | undefined;
let markersSeries: ISeriesApi<'Line'> | undefined;
let chartInstance: IChartApi | null = null;
let resizeObserver: ResizeObserver | null = null;

type Tool = 'select' | 'trendline' | 'horizontal';

interface Drawing {
  id: string;
  type: Extract<Tool, 'trendline' | 'horizontal'>;
  series: ISeriesApi<'Line'>;
  points: { time: Time; value: number }[];
}

interface ToolConfig {
  id: Tool;
  label: string;
  icon: Component;
}

const activeTool = ref<Tool>('select');
const drawings = ref<Drawing[]>([]);
const pendingPoints = ref<{ time: Time; value: number }[]>([]);

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const tools: ToolConfig[] = [
  { id: 'select', label: 'Inspect data', icon: Pointer },
  { id: 'trendline', label: 'Draw trendline', icon: TrendingUp },
  { id: 'horizontal', label: 'Horizontal level', icon: Minus }
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
    borderUpColor: '#22c55e',
    wickUpColor: '#22c55e',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    wickDownColor: '#ef4444'
  });

  markersSeries = chartInstance.addLineSeries({
    color: '#22c55e',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false
  });

  chartInstance.subscribeClick(handleChartClick);

  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      chartInstance?.resize(width, height);
    }
  });
  resizeObserver.observe(chartContainer.value);

  watch(
    () => marketStore.candles,
    candles => {
      candleSeries?.setData(candles as CandlestickData[]);
      refreshHorizontalLines();
    },
    { immediate: true }
  );

  watch(
    () => marketStore.activeMarkers,
    () => {
      renderMarkers();
    },
    { immediate: true, deep: true }
  );
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.unsubscribeClick(handleChartClick);
    chartInstance.remove();
    chartInstance = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
});

onUnmounted(() => {
  candleSeries = undefined;
  markersSeries = undefined;
});
</script>
