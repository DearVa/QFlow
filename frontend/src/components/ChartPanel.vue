<template>
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3 text-xs">
    <div class="flex flex-wrap gap-2 min-w-[14rem]">
      <Select v-model="marketStore.symbol" by="value" class="mt-4">
        <SelectTrigger class="w-[180px]">
          <SelectValue placeholder="Select a symbol" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="symbol in symbolOptions" :key="symbol.value" :value="symbol.value">
              <div class="flex flex-col">
                <span class="text-sm font-semibold tracking-wide">{{ symbol.label }}</span>
                <span class="text-xs text-muted-foreground">{{ symbol.description }}</span>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="flex items-center gap-3 text-right text-sm">
      <div v-for="metric in ['open', 'high', 'low', 'close', 'growth']" :key="metric">
        <span class="font-bold text-muted-foreground">{{ metric[0].toUpperCase() }}</span>
        <span class="ml-1 font-semibold" :style="{ color: ohlcMetrics.color }">
          {{ ohlcMetrics[metric as keyof typeof ohlcMetrics] }}
        </span>
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-hidden p-4">
    <div class="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card/70">
      <TooltipProvider>
        <div
          class="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-full border border-border/50 bg-background/70 p-2 shadow-xl backdrop-blur">
          <Tooltip v-for="tool in tools" :key="tool.id">
            <TooltipTrigger as-child>
              <Button size="icon" variant="ghost" :class="[
                'size-9 rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground',
                activeTool === tool.id && 'bg-primary/10 text-primary'
              ]" @click="selectTool(tool.id)">
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
              <Button size="icon" variant="ghost"
                class="size-9 rounded-full text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                @click="clearDrawings">
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
  </div>

  <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 px-6 py-3 text-xs">
    <div class="flex flex-wrap gap-2">
      <ToggleGroup v-model="marketStore.interval" type="single">
        <ToggleGroupItem v-for="frame in marketStore.intervalDurations" :key="frame" :value="frame">
          {{ frame }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div class="flex items-center gap-3 text-right text-sm">
      <div>
        <p class="font-semibold">{{ formattedNow }}</p>
        <p class="text-xs text-muted-foreground">{{ timezone }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch, type Component, computed } from 'vue';
import {
  createChart,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type CrosshairMoveEventParams,
  type SeriesMarker,
  type Time
} from 'lightweight-charts';
import { useMarketStore } from '@/stores/market';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eraser, Minus, Pointer, TrendingUp } from 'lucide-vue-next';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNow } from "@vueuse/core";

const chartContainer = ref<HTMLDivElement | null>(null);

const marketStore = useMarketStore();

interface SymbolOption {
  value: string;
  label: string;
  description: string;
}

const symbolOptions = computed<SymbolOption[]>(() => {
  if (marketStore.perpetualSymbols.length === 0) {
    return [
      { value: 'BTCUSDT', label: 'BTC / USDT', description: 'Bitcoin perpetual' },
      { value: 'ETHUSDT', label: 'ETH / USDT', description: 'Ethereum perpetual' },
    ];
  }
  return marketStore.perpetualSymbols.map(symbol => ({
    value: symbol.symbol,
    label: symbol.label,
    description: symbol.description,
  }));
});

const hoveredCandle = ref<CandlestickData | null>(null);

const ohlcMetrics = computed(() => {
  const current = hoveredCandle.value
    ?? marketStore.candles[marketStore.candles.length - 1];
  if (!current) {
    return { open: '-', high: '-', low: '-', close: '-', growth: '-', color: undefined };
  }

  const targetIndex = marketStore.candles.findIndex(candle => candle.time === current.time);
  const previous = targetIndex > 0 ? marketStore.candles[targetIndex - 1] : null;

  let growth = '-';
  let color = undefined;
  if (previous) {
    const growthValue = current.close - previous.close;
    const growthRate = (growthValue / previous.close) * 100;
    const prefix = growthValue >= 0 ? '+' : '';
    growth = `${prefix}${growthValue.toFixed(2)} (${growthRate.toFixed(2)}%)`;
    color = growthValue >= 0 ? marketStore.colors.upColor : marketStore.colors.downColor;
  }

  return {
    open: Number(current.open).toFixed(2),
    high: Number(current.high).toFixed(2),
    low: Number(current.low).toFixed(2),
    close: Number(current.close).toFixed(2),
    growth,
    color
  };
});

const now = useNow({ interval: 1000 });
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium', hour12: false });
const formattedNow = computed(() => formatter.format(now.value));

let candleSeries: ISeriesApi<'Candlestick'> | undefined;
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
  if (!candleSeries) return;
  const riskMarkers: SeriesMarker<Time>[] = marketStore.activeMarkers.map(marker => ({
    time: marker.time as unknown as Time,
    position: marker.type === 'take-profit' ? 'aboveBar' : 'belowBar',
    color: marker.type === 'take-profit' ? '#22c55e' : '#ef4444',
    shape: marker.type === 'take-profit' ? 'arrowDown' : 'arrowUp',
    text: marker.label
  }));
  const tradeMarkers: SeriesMarker<Time>[] = marketStore.activeStrategySignals.map(signal => ({
    time: signal.time as unknown as Time,
    position: 'belowBar',
    color: '#fbbf24',
    shape: 'circle',
    text: `Entry ${signal.price.toFixed(2)}`
  }));
  candleSeries.setMarkers([...riskMarkers, ...tradeMarkers]);
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

const handleCrosshairMove = (param: CrosshairMoveEventParams) => {
  if (!param.time || !candleSeries) {
    hoveredCandle.value = null;
    return;
  }
  const hovered = param.seriesData.get(candleSeries) as CandlestickData | undefined;
  hoveredCandle.value = hovered ?? null;
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
    upColor: marketStore.colors.upColor,
    borderUpColor: marketStore.colors.borderUpColor,
    wickUpColor: marketStore.colors.wickUpColor,
    downColor: marketStore.colors.downColor,
    borderDownColor: marketStore.colors.borderDownColor,
    wickDownColor: marketStore.colors.wickDownColor
  });

  chartInstance.subscribeClick(handleChartClick);
  chartInstance.subscribeCrosshairMove(handleCrosshairMove);

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

  watch(
    () => marketStore.activeStrategySignals,
    () => {
      renderMarkers();
    },
    { immediate: true, deep: true }
  );
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.unsubscribeClick(handleChartClick);
    chartInstance.unsubscribeCrosshairMove(handleCrosshairMove);
    chartInstance.remove();
    chartInstance = null;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
});

onUnmounted(() => {
  candleSeries = undefined;
});
</script>
