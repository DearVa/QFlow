<template>
  <div class="relative h-full w-full overflow-hidden rounded-lg border border-slate-900 bg-slate-950">
    <div
        class="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/90 p-2 text-[11px] uppercase tracking-[0.4em] shadow-2xl"
    >
      <Button size="sm" variant="ghost" class="justify-start text-[11px] uppercase" @click="compileOnly">Compile
      </Button>
      <Button size="sm" variant="secondary" class="justify-start text-[11px] uppercase" @click="runBacktest">
        Run backtest
      </Button>
      <div class="mt-2 border-t border-slate-900 pt-2">
        <Button size="sm" variant="ghost" class="justify-start text-[11px] uppercase" @click="saveSnapshot">
          Save snapshot
        </Button>
        <Button size="sm" variant="ghost" class="justify-start text-[11px] uppercase" @click="loadSnapshot">
          Load snapshot
        </Button>
      </div>
      <div class="mt-2 border-t border-slate-900 pt-2">
        <Button size="sm" variant="ghost" class="justify-start text-[11px] uppercase" @click="exportGraph">
          Export JSON
        </Button>
        <Button size="sm" variant="ghost" class="justify-start text-[11px] uppercase" @click="importGraph">
          Import JSON
        </Button>
      </div>
      <div class="mt-2 border-t border-slate-900 pt-2">
        <Button size="sm" variant="ghost" class="justify-start text-[11px] uppercase text-rose-300" @click="reset">
          Reset
        </Button>
      </div>
    </div>
    <div class="h-full w-full pl-28">
      <div ref="editor" class="h-full w-full"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { NodeEditor } from 'rete';
import { useMarketStore } from '@/stores/market';
import { createStrategyEditor, type StrategyEditorSchemes } from '@/services/strategy';
import type { CompiledStrategy, StrategyNodeGraph } from '@/types/strategy';
import { Button } from '@/components/ui/button';

const marketStore = useMarketStore();
const editor = ref<HTMLDivElement | null>(null);
type SerializableEditor = NodeEditor<StrategyEditorSchemes> & {
  toJSON: () => StrategyNodeGraph;
  fromJSON: (graph: StrategyNodeGraph) => Promise<void>;
};

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
  const blob = new Blob([data], {type: 'application/json'});
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

onMounted(async () => {
  if (!editor.value) return;
  nodeEditor = (await createStrategyEditor(editor.value)) as SerializableEditor;
});
</script>
