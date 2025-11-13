<template>
  <div class="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card/70">
    <TooltipProvider>
      <div
        class="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-2xl border border-border/50 bg-background/80 p-3 shadow-xl backdrop-blur"
      >
        <template v-for="(section, sectionIndex) in toolbarSections" :key="section.id">
          <div class="flex flex-col gap-1">
            <Tooltip v-for="action in section.items" :key="action.id">
              <TooltipTrigger as-child>
                <Button
                  size="icon"
                  variant="ghost"
                  :class="[
                    'size-10 rounded-2xl text-muted-foreground transition hover:text-primary',
                    action.highlight && 'text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-100',
                    action.tone === 'danger' && 'text-rose-300 hover:bg-rose-500/10 hover:text-rose-100'
                  ]"
                  @click="action.handler()"
                >
                  <component :is="action.icon" class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p class="text-xs font-medium">{{ action.label }}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div v-if="sectionIndex !== toolbarSections.length - 1" class="h-px bg-border/60" />
        </template>
      </div>
    </TooltipProvider>
    <div class="h-full w-full pl-28">
      <div ref="editor" class="h-full w-full"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, type Component } from 'vue';
import type { NodeEditor } from 'rete';
import { useMarketStore } from '@/stores/market';
import { createStrategyEditor, type StrategyEditorSchemes } from '@/services/strategy';
import type { CompiledStrategy, StrategyNodeGraph } from '@/types/strategy';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CircuitBoard, Download, FolderOpen, Play, Save, Undo2, Upload } from 'lucide-vue-next';

const marketStore = useMarketStore();
const editor = ref<HTMLDivElement | null>(null);

type SerializableEditor = NodeEditor<StrategyEditorSchemes> & {
  toJSON: () => StrategyNodeGraph;
  fromJSON: (graph: StrategyNodeGraph) => Promise<void>;
};

interface ToolbarAction {
  id: string;
  label: string;
  icon: Component;
  handler: () => void;
  highlight?: boolean;
  tone?: 'default' | 'danger';
}

interface ToolbarSection {
  id: string;
  items: ToolbarAction[];
}

let nodeEditor: SerializableEditor | null = null;
let lastCompiled: CompiledStrategy | null = null;
const storageKey = 'qflow-strategy-graph';
const isBrowser = typeof window !== 'undefined';

const compileOnly = async () => {
  if (!nodeEditor) return;
  lastCompiled = await marketStore.compileStrategy(nodeEditor.toJSON());
};

const runBacktest = async () => {
  await compileOnly();
  if (lastCompiled) {
    await marketStore.activateStrategy(lastCompiled);
  }
};

const reset = () => {
  if (!nodeEditor) return;
  nodeEditor.clear();
};

const saveSnapshot = () => {
  if (!nodeEditor || !isBrowser) return;
  const snapshot = JSON.stringify(nodeEditor.toJSON());
  localStorage.setItem(storageKey, snapshot);
};

const loadSnapshot = async () => {
  if (!nodeEditor || !isBrowser) return;
  const payload = localStorage.getItem(storageKey);
  if (!payload) return;
  await nodeEditor.fromJSON(JSON.parse(payload));
};

const exportGraph = () => {
  if (!nodeEditor) return;
  const data = JSON.stringify(nodeEditor.toJSON(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'strategy-graph.json';
  anchor.click();
  URL.revokeObjectURL(url);
};

const importGraph = async () => {
  if (!nodeEditor || !isBrowser) return;
  const payload = window.prompt('Paste the strategy graph JSON');
  if (!payload) return;
  try {
    await nodeEditor.fromJSON(JSON.parse(payload));
  } catch (error) {
    console.error('Unable to import strategy graph', error);
  }
};

const toolbarSections: ToolbarSection[] = [
  {
    id: 'build',
    items: [
      { id: 'compile', label: 'Compile', icon: CircuitBoard, handler: () => compileOnly() },
      { id: 'run', label: 'Backtest', icon: Play, handler: () => runBacktest(), highlight: true }
    ]
  },
  {
    id: 'snapshot',
    items: [
      { id: 'save', label: 'Save snapshot', icon: Save, handler: () => saveSnapshot() },
      { id: 'load', label: 'Load snapshot', icon: FolderOpen, handler: () => loadSnapshot() }
    ]
  },
  {
    id: 'transfer',
    items: [
      { id: 'export', label: 'Export JSON', icon: Download, handler: () => exportGraph() },
      { id: 'import', label: 'Import JSON', icon: Upload, handler: () => importGraph() }
    ]
  },
  {
    id: 'reset',
    items: [{ id: 'reset', label: 'Reset editor', icon: Undo2, handler: () => reset(), tone: 'danger' }]
  }
];

onMounted(async () => {
  if (!editor.value) return;
  nodeEditor = (await createStrategyEditor(editor.value)) as SerializableEditor;
});
</script>
