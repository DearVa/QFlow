<template>
  <div class="flex min-h-screen flex-1 flex-col">
    <MenuBar :panels="panelItems" @toggle-panel="togglePanel" @reset-layout="resetLayout" />
    <div ref="workspaceRef" class="flex flex-1 bg-slate-950 text-slate-100">
      <template v-if="panelVisibility.chart">
        <div
          class="relative flex-shrink-0 overflow-hidden border-r border-slate-900"
          :style="leftPaneStyle"
        >
          <div class="h-full w-full p-4">
            <ChartPanel />
          </div>
          <div
            v-if="showRightColumn"
            class="absolute top-0 right-0 z-20 h-full w-1 cursor-col-resize bg-slate-900/60 transition hover:bg-slate-700"
            @pointerdown="event => startDrag('vertical', event)"
          ></div>
        </div>
      </template>

      <template v-if="showRightColumn">
        <div ref="rightColumnRef" class="relative flex flex-1 flex-col">
          <div
            v-if="panelVisibility.node"
            class="relative border-b border-slate-900 bg-slate-950"
            :style="topPaneStyle"
          >
            <div class="h-full w-full p-4">
              <StrategyNodeEditor />
            </div>
            <div
              v-if="panelVisibility.metrics"
              class="absolute bottom-0 left-0 right-0 z-20 h-1 cursor-row-resize bg-slate-900/60 transition hover:bg-slate-700"
              @pointerdown="event => startDrag('horizontal', event)"
            ></div>
          </div>
          <div v-if="panelVisibility.metrics" class="flex-1 overflow-hidden bg-slate-950 p-4">
            <StrategyMetrics />
          </div>
        </div>
      </template>

      <div
        v-if="!panelVisibility.chart && !showRightColumn"
        class="flex flex-1 items-center justify-center text-sm text-slate-500"
      >
        <p>Use the View menu to toggle the panels you need.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import MenuBar from '../components/MenuBar.vue';
import ChartPanel from '../components/ChartPanel.vue';
import StrategyNodeEditor from '../components/StrategyNodeEditor.vue';
import StrategyMetrics from '../components/StrategyMetrics.vue';

type PanelKey = 'chart' | 'node' | 'metrics';

const panelVisibility = reactive<Record<PanelKey, boolean>>({
  chart: true,
  node: true,
  metrics: true
});

const leftPaneWidth = ref(60);
const rightPaneSplit = ref(60);

const workspaceRef = ref<HTMLDivElement | null>(null);
const rightColumnRef = ref<HTMLDivElement | null>(null);

const showRightColumn = computed(() => panelVisibility.node || panelVisibility.metrics);

const panelItems = computed(() => [
  { id: 'chart', label: 'Market intelligence', active: panelVisibility.chart },
  { id: 'node', label: 'Strategy editor', active: panelVisibility.node },
  { id: 'metrics', label: 'Performance telemetry', active: panelVisibility.metrics }
]);

const leftPaneStyle = computed(() => ({
  flexBasis: showRightColumn.value ? `${leftPaneWidth.value}%` : '100%',
  minWidth: showRightColumn.value ? '25%' : '100%'
}));

const topPaneStyle = computed(() => {
  if (!panelVisibility.metrics) {
    return { flex: 1 };
  }
  return { flexBasis: `${rightPaneSplit.value}%`, minHeight: '30%' };
});

const togglePanel = (key: string) => {
  if (!['chart', 'node', 'metrics'].includes(key)) {
    return;
  }
  const typedKey = key as PanelKey;
  panelVisibility[typedKey] = !panelVisibility[typedKey];
};

const resetLayout = () => {
  leftPaneWidth.value = 60;
  rightPaneSplit.value = 60;
  panelVisibility.chart = true;
  panelVisibility.node = true;
  panelVisibility.metrics = true;
};

let dragType: 'vertical' | 'horizontal' | null = null;

const handlePointerMove = (event: PointerEvent) => {
  if (dragType === 'vertical' && workspaceRef.value && showRightColumn.value) {
    const rect = workspaceRef.value.getBoundingClientRect();
    const percentage = ((event.clientX - rect.left) / rect.width) * 100;
    leftPaneWidth.value = Math.min(80, Math.max(25, percentage));
  }

  if (dragType === 'horizontal' && rightColumnRef.value && panelVisibility.node && panelVisibility.metrics) {
    const rect = rightColumnRef.value.getBoundingClientRect();
    const percentage = ((event.clientY - rect.top) / rect.height) * 100;
    rightPaneSplit.value = Math.min(80, Math.max(30, percentage));
  }
};

const stopDrag = () => {
  dragType = null;
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', stopDrag);
};

const startDrag = (type: 'vertical' | 'horizontal', event: PointerEvent) => {
  dragType = type;
  event.preventDefault();
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopDrag);
};

onBeforeUnmount(() => {
  stopDrag();
});
</script>
