<template>
  <div class="h-screen w-full overflow-hidden bg-background text-foreground">
    <ResizablePanelGroup direction="horizontal" class="h-full w-full">
      <ResizablePanel :default-size="65" class="flex flex-col border-r border-border/50 bg-slate-950/60">
        <ChartPanel />
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
import { Download, Play, Upload } from 'lucide-vue-next';
import ChartPanel from '@/components/ChartPanel.vue';
import StrategyEditor from '@/components/StrategyEditor.vue';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useMarketStore } from '@/stores/market';
import type { StrategyNodeGraph } from '@/types/strategy';
import { strategyGraphSchema } from '@/lib/strategy-schema';

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
