<template>
  <div class="h-screen w-full overflow-hidden bg-background text-foreground">
    <ResizablePanelGroup direction="horizontal" class="h-full w-full">
      <ResizablePanel :default-size="65" class="flex flex-col border-r border-border/50 bg-slate-950/60">
        <div class="flex flex-wrap items-center gap-6 border-b border-border/60 px-6 py-4">
          <div class="w-64 min-w-[14rem]">
            <Combobox v-model="selectedSymbol">
              <ComboboxAnchor class="w-full">
                <ComboboxTrigger class="w-full justify-between rounded-xl border border-border/60 bg-slate-900/80 px-4 py-2 text-left">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold tracking-wide">{{ symbolLabel }}</span>
                    <span class="text-xs text-muted-foreground">{{ symbolDescription }}</span>
                  </div>
                  <ChevronsUpDown class="size-4 text-muted-foreground" />
                </ComboboxTrigger>
              </ComboboxAnchor>
              <ComboboxContent class="w-72 rounded-xl border border-border/70 bg-slate-950">
                <ComboboxInput placeholder="Search pairs" />
                <ComboboxList>
                  <ComboboxViewport>
                    <ComboboxGroup heading="Supported pairs">
                      <ComboboxItem v-for="option in symbolOptions" :key="option.value" :value="option.value">
                        <div class="flex w-full items-center gap-2">
                          <ComboboxItemIndicator>
                            <Check class="size-4 text-primary" />
                          </ComboboxItemIndicator>
                          <div class="flex flex-col">
                            <span class="text-sm font-medium">{{ option.label }}</span>
                            <span class="text-xs text-muted-foreground">{{ option.description }}</span>
                          </div>
                        </div>
                      </ComboboxItem>
                    </ComboboxGroup>
                  </ComboboxViewport>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <div class="grid flex-1 grid-cols-2 gap-6 md:grid-cols-4">
            <div
              v-for="metric in ohlcMetrics"
              :key="metric.label"
              class="rounded-xl border border-border/50 bg-slate-900/60 px-4 py-2"
            >
              <p class="text-xs text-muted-foreground uppercase tracking-wide">{{ metric.label }}</p>
              <p class="text-lg font-semibold text-slate-50">{{ metric.value }}</p>
            </div>
          </div>
        </div>
        <div class="flex-1 overflow-hidden p-4">
          <ChartPanel />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 px-6 py-3 text-xs">
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="frame in intervalOptions"
              :key="frame"
              size="sm"
              :variant="frame === currentInterval ? 'default' : 'secondary'"
              class="rounded-full"
              @click="() => selectInterval(frame)"
            >
              {{ frame }}
            </Button>
          </div>
          <div class="flex items-center gap-3 text-right text-sm">
            <Clock class="size-4 text-muted-foreground" />
            <div>
              <p class="font-semibold">{{ formattedNow }}</p>
              <p class="text-xs text-muted-foreground">{{ timezone }}</p>
            </div>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="35" class="flex flex-col bg-slate-950/40">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3">
          <Menubar class="bg-transparent">
            <MenubarMenu>
              <MenubarTrigger class="gap-2">
                File
              </MenubarTrigger>
              <MenubarContent class="w-48 rounded-xl border border-border/50 bg-slate-950/90">
                <MenubarItem class="gap-2" @click="triggerImport">
                  <Upload class="size-4" /> Import strategy
                </MenubarItem>
                <MenubarItem class="gap-2" @click="exportStrategy">
                  <Download class="size-4" /> Export strategy
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
          <div class="flex items-center gap-4">
            <p :class="['text-sm', compileStatusClass]">{{ compileStatus }}</p>
            <Button class="gap-2" :disabled="isCompiling" @click="compileAndActivate">
              <Play class="size-4" />
              <span>{{ isCompiling ? 'Compiling…' : 'Compile & Apply' }}</span>
            </Button>
          </div>
        </div>
        <div class="flex-1 overflow-hidden p-4">
          <StrategyEditor v-model="strategyGraph" />
        </div>
        <div class="border-t border-border/60 px-6 py-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strategy KPIs</p>
          <div class="grid gap-3 md:grid-cols-3">
            <Card
              v-for="metric in marketStore.metrics"
              :key="metric.label"
              class="border border-border/60 bg-slate-900/70"
            >
              <CardHeader class="p-3">
                <CardDescription class="text-xs uppercase tracking-wide">{{ metric.label }}</CardDescription>
                <CardTitle class="text-xl font-semibold">{{ metric.value }}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="handleImport" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNow } from '@vueuse/core';
import { Check, ChevronsUpDown, Clock, Download, Play, Upload } from 'lucide-vue-next';
import ChartPanel from '@/components/ChartPanel.vue';
import StrategyEditor from '@/components/StrategyEditor.vue';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Combobox,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport
} from '@/components/ui/combobox';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useMarketStore } from '@/stores/market';
import type { StrategyNodeGraph } from '@/types/strategy';
import { strategyGraphSchema } from '@/lib/strategy-schema';

interface SymbolOption {
  value: string;
  label: string;
  description: string;
}

const createGraphId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const defaultStrategyGraph: StrategyNodeGraph = {
  id: 'strategy-default',
  name: 'Baseline dip buyer',
  nodes: [
    {
      id: 'node-condition',
      type: 'condition',
      label: 'Price drop trigger',
      x: 180,
      y: 160,
      data: { window: 15, drop: 1, templateKey: 'price-drop', type: 'condition' }
    },
    {
      id: 'node-action',
      type: 'action',
      label: 'Market buy',
      x: 480,
      y: 200,
      data: { size: 100, templateKey: 'market-order', type: 'action' }
    },
    {
      id: 'node-risk',
      type: 'risk',
      label: 'Risk guard',
      x: 780,
      y: 240,
      data: { takeProfit: 10, stopLoss: 5, templateKey: 'risk-guard', type: 'risk' }
    }
  ],
  connections: [
    { id: 'conn-1', source: { nodeId: 'node-condition', portId: 'trigger' }, target: { nodeId: 'node-action', portId: 'signal' } },
    { id: 'conn-2', source: { nodeId: 'node-action', portId: 'fill' }, target: { nodeId: 'node-risk', portId: 'entry' } }
  ]
};

const cloneGraph = (graph: StrategyNodeGraph): StrategyNodeGraph => JSON.parse(JSON.stringify(graph));

const marketStore = useMarketStore();
const strategyGraph = ref<StrategyNodeGraph>(cloneGraph(defaultStrategyGraph));
const symbolOptions: SymbolOption[] = [
  { value: 'BTCUSDT', label: 'BTC / USDT', description: 'Bitcoin perpetual' },
  { value: 'BNBUSDT', label: 'BNB / USDT', description: 'BNB perpetual' },
  { value: 'ETHUSDT', label: 'ETH / USDT', description: 'Ethereum perpetual' },
  { value: 'SOLUSDT', label: 'SOL / USDT', description: 'Solana perpetual' }
];
const intervalOptions = [
  '1s',
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M'
];

const selectedSymbol = computed({
  get: () => marketStore.symbol,
  set: value => {
    if (typeof value === 'string') {
      marketStore.setSymbol(value);
    }
  }
});

const symbolLabel = computed(() => {
  const match = symbolOptions.find(option => option.value === selectedSymbol.value);
  return match?.label ?? selectedSymbol.value;
});

const symbolDescription = computed(() => {
  const match = symbolOptions.find(option => option.value === selectedSymbol.value);
  return match?.description ?? 'Spot market';
});

const ohlcMetrics = computed(() => {
  const last = marketStore.candles[marketStore.candles.length - 1];
  if (!last) {
    return [
      { label: 'Open', value: '-' },
      { label: 'High', value: '-' },
      { label: 'Low', value: '-' },
      { label: 'Close', value: '-' }
    ];
  }
  return [
    { label: 'Open', value: Number(last.open).toFixed(2) },
    { label: 'High', value: Number(last.high).toFixed(2) },
    { label: 'Low', value: Number(last.low).toFixed(2) },
    { label: 'Close', value: Number(last.close).toFixed(2) }
  ];
});

const currentInterval = computed(() => marketStore.interval);
const selectInterval = (frame: string) => {
  marketStore.setIntervalFrame(frame);
};

const now = useNow({ interval: 1000 });
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' });
const formattedNow = computed(() => formatter.format(now.value));

const fileInput = ref<HTMLInputElement | null>(null);
const isCompiling = ref(false);
const compileStatus = ref('Awaiting compilation');
const compileStatusTone = ref<'default' | 'success' | 'error'>('default');

const compileStatusClass = computed(() => {
  if (compileStatusTone.value === 'success') {
    return 'text-emerald-400';
  }
  if (compileStatusTone.value === 'error') {
    return 'text-rose-400';
  }
  return 'text-muted-foreground';
});

const compileAndActivate = async () => {
  try {
    isCompiling.value = true;
    compileStatusTone.value = 'default';
    compileStatus.value = 'Compiling strategy…';
    const compiled = await marketStore.compileStrategy(strategyGraph.value);
    await marketStore.activateStrategy(compiled);
    compileStatus.value = 'Strategy applied to chart';
    compileStatusTone.value = 'success';
  } catch (error) {
    compileStatus.value = error instanceof Error ? error.message : 'Unable to compile strategy';
    compileStatusTone.value = 'error';
  } finally {
    isCompiling.value = false;
  }
};

const triggerImport = () => {
  fileInput.value?.click();
};

const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  try {
    const payload = await file.text();
    const parsed = strategyGraphSchema.parse(JSON.parse(payload));
    strategyGraph.value = {
      ...parsed,
      id: parsed.id || createGraphId()
    };
    compileStatus.value = 'Strategy imported';
    compileStatusTone.value = 'success';
  } catch (error) {
    compileStatus.value = error instanceof Error ? error.message : 'Invalid strategy file';
    compileStatusTone.value = 'error';
  } finally {
    input.value = '';
  }
};

const exportStrategy = () => {
  const serialized = JSON.stringify(strategyGraph.value, null, 2);
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${strategyGraph.value.name.replace(/\s+/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  compileStatus.value = 'Strategy exported';
  compileStatusTone.value = 'success';
};
</script>
