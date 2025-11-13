<template>
  <div class="node-editor">
    <div ref="editor" class="editor"></div>
    <div class="toolbar">
      <button @click="emitCode">Compile Strategy</button>
      <button @click="reset">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { NodeEditor } from 'rete';
import { useMarketStore } from '../stores/market';
import { createStrategyEditor } from '../services/strategy';

const marketStore = useMarketStore();
const editor = ref<HTMLDivElement | null>(null);
let nodeEditor: NodeEditor | null = null;

const emitCode = async () => {
  if (!nodeEditor) return;
  const compiled = await marketStore.compileStrategy(nodeEditor.toJSON());
  marketStore.activateStrategy(compiled);
};

const reset = () => {
  if (!nodeEditor) return;
  nodeEditor.clear();
};

onMounted(async () => {
  if (!editor.value) return;
  nodeEditor = await createStrategyEditor(editor.value);
});
</script>

<style scoped>
.node-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor {
  flex: 1;
  background: #020617;
  border-radius: 12px;
  min-height: 320px;
}

.toolbar {
  display: flex;
  gap: 1rem;
}

button {
  background: #0ea5e9;
  color: #020617;
  border: none;
  border-radius: 8px;
  padding: 0.4rem 1rem;
  cursor: pointer;
}
</style>
