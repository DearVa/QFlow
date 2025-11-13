<template>
  <div class="flex min-h-screen flex-1 flex-col bg-[radial-gradient(circle_at_top,#020817,#0f172a)] text-foreground">
    <MenuBar :panels="menuPanels" @toggle-panel="handlePanelToggle" @reset-layout="resetLayout" />
    <main class="flex flex-1 flex-col gap-4 px-4 py-4">
      <section class="flex flex-1 flex-col gap-3 rounded-3xl border border-border/60 bg-background/70 p-3 shadow-[0_20px_120px_rgba(15,23,42,0.65)]">
        <div class="flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-foreground">Workspace panels</span>
            <span class="hidden rounded-full border border-border/60 px-2 py-0.5 text-[10px] sm:inline-flex">Drag tabs to rearrange</span>
          </div>
          <span>{{ visiblePanelCount }} active panes</span>
        </div>
        <div
          ref="workspaceRef"
          class="flex h-full flex-1 overflow-hidden rounded-2xl border border-border/50 bg-[radial-gradient(circle_at_top,#111827,#020617)]"
        >
          <template v-if="panelGroups.length">
            <div
              class="flex w-2 items-center justify-center"
              @dragover.prevent
              @dragenter.prevent="setDropIndicator(0)"
              @dragleave="clearDropIndicator(0)"
              @drop.prevent="handleDropBetween(0)"
            >
              <div v-if="dropIndicatorIndex === 0" class="h-16 w-px rounded-full bg-primary pointer-events-none"></div>
            </div>
            <template v-for="(group, groupIndex) in panelGroups" :key="group.id">
              <div class="flex h-full flex-col border-r border-border/50 bg-background/60 last:border-r-0" :style="{ width: `${group.width}%` }">
                <div class="flex items-center gap-1 border-b border-border/60 bg-background/70 px-2 py-1">
                  <div
                    class="flex h-6 w-2 items-center justify-center"
                    @dragover.prevent
                    @dragenter.prevent="setTabDropTarget(group.id, 0)"
                    @dragleave="clearTabDropTarget(group.id, 0)"
                    @drop.prevent="handleDropWithinGroup(group.id, 0)"
                  >
                    <div v-if="isTabDropTarget(group.id, 0)" class="h-5 w-0.5 rounded-full bg-primary pointer-events-none"></div>
                  </div>
                  <template v-for="(tabId, tabIndex) in group.tabs" :key="tabId">
                    <div
                      class="group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      :class="[
                        group.activeTab === tabId
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      ]"
                      draggable="true"
                      @dragstart="event => handleDragStart(tabId, group.id, event)"
                      @dragend="handleDragEnd"
                      role="button"
                      tabindex="0"
                      @click="setActiveTab(group.id, tabId)"
                      @keydown.enter.prevent="setActiveTab(group.id, tabId)"
                      @keydown.space.prevent="setActiveTab(group.id, tabId)"
                    >
                      <component :is="definitionMap[tabId].icon" class="size-3.5" />
                      <span>{{ definitionMap[tabId].label }}</span>
                      <button class="ml-2 text-muted-foreground transition hover:text-foreground" @click.stop="closePanel(tabId)">
                        <X class="size-3" />
                      </button>
                    </div>
                    <div
                      class="flex h-6 w-2 items-center justify-center"
                      @dragover.prevent
                      @dragenter.prevent="setTabDropTarget(group.id, tabIndex + 1)"
                      @dragleave="clearTabDropTarget(group.id, tabIndex + 1)"
                      @drop.prevent="handleDropWithinGroup(group.id, tabIndex + 1)"
                    >
                      <div v-if="isTabDropTarget(group.id, tabIndex + 1)" class="h-5 w-0.5 rounded-full bg-primary pointer-events-none"></div>
                    </div>
                  </template>
                  <div class="ml-auto" />
                </div>
                <div class="relative flex flex-1 flex-col">
                  <div
                    v-if="groupIndex < panelGroups.length - 1"
                    class="absolute inset-y-0 right-0 w-1 cursor-col-resize bg-transparent"
                    @pointerdown="event => startResize(groupIndex, event)"
                  ></div>
                  <div class="flex-1 overflow-hidden p-3">
                    <component
                      :is="group.activeTab ? definitionMap[group.activeTab].component : null"
                      v-if="group.activeTab"
                      class="h-full w-full"
                    />
                    <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Select a tab to begin.
                    </div>
                  </div>
                </div>
              </div>
              <div
                class="flex w-2 items-center justify-center"
                @dragover.prevent
                @dragenter.prevent="setDropIndicator(groupIndex + 1)"
                @dragleave="clearDropIndicator(groupIndex + 1)"
                @drop.prevent="handleDropBetween(groupIndex + 1)"
              >
                <div v-if="dropIndicatorIndex === groupIndex + 1" class="h-16 w-px rounded-full bg-primary pointer-events-none"></div>
              </div>
            </template>
          </template>
          <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <p>No panels are visible.</p>
            <p class="text-xs">Use the View menu above to turn them back on.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, reactive, ref, type Component } from 'vue';
import MenuBar from '@/components/MenuBar.vue';
import ChartPanel from '@/components/ChartPanel.vue';
import StrategyNodeEditor from '@/components/StrategyNodeEditor.vue';
import StrategyMetrics from '@/components/StrategyMetrics.vue';
import { ActivitySquare, CandlestickChart, GitBranch, X } from 'lucide-vue-next';

type PanelKey = 'chart' | 'node' | 'metrics';

interface DockPanelDefinition {
  id: PanelKey;
  label: string;
  description: string;
  component: Component;
  icon: Component;
}

interface DockGroup {
  id: string;
  tabs: PanelKey[];
  activeTab: PanelKey | null;
  width: number;
}

interface DragState {
  tabId: PanelKey;
  sourceGroupId: string;
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const panelDefinitions: DockPanelDefinition[] = [
  {
    id: 'chart',
    label: 'Market intelligence',
    description: 'Live liquidity and instruments',
    component: markRaw(ChartPanel),
    icon: CandlestickChart
  },
  {
    id: 'node',
    label: 'Strategy editor',
    description: 'Graph editor for decision flow',
    component: markRaw(StrategyNodeEditor),
    icon: GitBranch
  },
  {
    id: 'metrics',
    label: 'Performance telemetry',
    description: 'Aggregated performance metrics',
    component: markRaw(StrategyMetrics),
    icon: ActivitySquare
  }
];

const definitionMap = panelDefinitions.reduce<Record<PanelKey, DockPanelDefinition>>((acc, panel) => {
  acc[panel.id] = panel;
  return acc;
}, {} as Record<PanelKey, DockPanelDefinition>);

const panelVisibility = reactive<Record<PanelKey, boolean>>({
  chart: true,
  node: true,
  metrics: true
});

const workspaceRef = ref<HTMLDivElement | null>(null);
const panelGroups = ref<DockGroup[]>(createDefaultGroups());
const draggingTab = ref<DragState | null>(null);
const dropIndicatorIndex = ref<number | null>(null);
const tabDropTarget = ref<{ groupId: string; index: number } | null>(null);

const menuPanels = computed(() =>
  panelDefinitions.map(panel => ({
    id: panel.id,
    label: panel.label,
    description: panel.description,
    active: panelVisibility[panel.id]
  }))
);

const visiblePanelCount = computed(() => panelGroups.value.reduce((sum, group) => sum + group.tabs.length, 0));

const handlePanelToggle = (id: PanelKey, value: boolean) => {
  if (value) {
    openPanel(id);
  } else {
    closePanel(id);
  }
};

function createDefaultGroups(): DockGroup[] {
  return [
    { id: createId(), tabs: ['chart'], activeTab: 'chart', width: 55 },
    { id: createId(), tabs: ['node', 'metrics'], activeTab: 'node', width: 45 }
  ];
}

function resetLayout() {
  panelGroups.value = createDefaultGroups();
  panelVisibility.chart = true;
  panelVisibility.node = true;
  panelVisibility.metrics = true;
}

function handleDragStart(tabId: PanelKey, sourceGroupId: string, event: DragEvent) {
  draggingTab.value = { tabId, sourceGroupId };
  event.dataTransfer?.setData('text/plain', tabId);
  event.dataTransfer?.setDragImage?.(new Image(), 0, 0);
}

function handleDragEnd() {
  draggingTab.value = null;
  dropIndicatorIndex.value = null;
  tabDropTarget.value = null;
}

function setDropIndicator(index: number) {
  dropIndicatorIndex.value = index;
}

function clearDropIndicator(index: number) {
  if (dropIndicatorIndex.value === index) {
    dropIndicatorIndex.value = null;
  }
}

function setTabDropTarget(groupId: string, index: number) {
  tabDropTarget.value = { groupId, index };
}

function clearTabDropTarget(groupId: string, index: number) {
  if (tabDropTarget.value?.groupId === groupId && tabDropTarget.value.index === index) {
    tabDropTarget.value = null;
  }
}

function isTabDropTarget(groupId: string, index: number) {
  return tabDropTarget.value?.groupId === groupId && tabDropTarget.value?.index === index;
}

function handleDropWithinGroup(groupId: string, insertIndex: number) {
  if (!draggingTab.value) return;
  moveTabToGroupAt(groupId, insertIndex);
  tabDropTarget.value = null;
}

function moveTabToGroupAt(groupId: string, insertIndex: number) {
  const dragState = draggingTab.value;
  if (!dragState) return;
  const { tabId, sourceGroupId } = dragState;
  const targetGroup = panelGroups.value.find(group => group.id === groupId);
  if (!targetGroup) return;

  if (sourceGroupId === groupId) {
    const currentIndex = targetGroup.tabs.indexOf(tabId);
    if (currentIndex === -1) return;
    targetGroup.tabs.splice(currentIndex, 1);
    const normalizedIndex = currentIndex < insertIndex ? insertIndex - 1 : insertIndex;
    targetGroup.tabs.splice(normalizedIndex, 0, tabId);
    targetGroup.activeTab = tabId;
    return;
  }

  const sourceGroup = panelGroups.value.find(group => group.id === sourceGroupId);
  if (!sourceGroup) return;
  if (!removeTabFromGroup(sourceGroup, tabId)) return;
  const normalizedIndex = Math.min(insertIndex, targetGroup.tabs.length);
  targetGroup.tabs.splice(normalizedIndex, 0, tabId);
  targetGroup.activeTab = tabId;
  panelVisibility[tabId] = true;
}

function handleDropBetween(index: number) {
  if (!draggingTab.value) return;
  moveTabToNewGroup(index);
  dropIndicatorIndex.value = null;
}

function moveTabToNewGroup(insertIndex: number) {
  const dragState = draggingTab.value;
  if (!dragState) return;
  const { tabId, sourceGroupId } = dragState;
  const sourceGroup = panelGroups.value.find(group => group.id === sourceGroupId);
  if (!sourceGroup) return;
  if (!removeTabFromGroup(sourceGroup, tabId)) return;
  insertGroupWithTab(tabId, insertIndex);
  panelVisibility[tabId] = true;
}

function insertGroupWithTab(tabId: PanelKey, insertIndex: number) {
  const nextGroup: DockGroup = { id: createId(), tabs: [tabId], activeTab: tabId, width: 100 };
  if (!panelGroups.value.length) {
    panelGroups.value = [nextGroup];
    nextGroup.width = 100;
    return;
  }
  const newWidth = 100 / (panelGroups.value.length + 1);
  const scale = (100 - newWidth) / 100;
  panelGroups.value.forEach(group => {
    group.width = Number((group.width * scale).toFixed(2));
  });
  nextGroup.width = newWidth;
  panelGroups.value.splice(insertIndex, 0, nextGroup);
}

function removeGroupIfEmpty(groupId: string) {
  const index = panelGroups.value.findIndex(group => group.id === groupId);
  if (index === -1) return;
  if (panelGroups.value[index].tabs.length) return;
  const removedWidth = panelGroups.value[index].width;
  panelGroups.value.splice(index, 1);
  if (!panelGroups.value.length) {
    return;
  }
  const distribute = removedWidth / panelGroups.value.length;
  panelGroups.value.forEach(group => {
    group.width += distribute;
  });
}

function removeTabFromGroup(group: DockGroup, tabId: PanelKey) {
  const index = group.tabs.indexOf(tabId);
  if (index === -1) return false;
  group.tabs.splice(index, 1);
  if (group.activeTab === tabId) {
    group.activeTab = group.tabs[index] ?? group.tabs[0] ?? null;
  }
  removeGroupIfEmpty(group.id);
  return true;
}

function startResize(index: number, event: PointerEvent) {
  if (!workspaceRef.value) return;
  const containerWidth = workspaceRef.value.getBoundingClientRect().width;
  const startX = event.clientX;
  const startWidths = panelGroups.value.map(group => group.width);

  const handleMove = (moveEvent: PointerEvent) => {
    const delta = ((moveEvent.clientX - startX) / containerWidth) * 100;
    const nextValue = startWidths[index] + delta;
    const neighborValue = startWidths[index + 1] - delta;
    if (nextValue < 15 || neighborValue < 15) {
      return;
    }
    panelGroups.value[index].width = nextValue;
    panelGroups.value[index + 1].width = neighborValue;
  };

  const stop = () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', stop);
  };

  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', stop);
}

function setActiveTab(groupId: string, tabId: PanelKey) {
  const group = panelGroups.value.find(item => item.id === groupId);
  if (!group) return;
  group.activeTab = tabId;
}

function closePanel(panelId: PanelKey) {
  const group = panelGroups.value.find(item => item.tabs.includes(panelId));
  if (!group) return;
  removeTabFromGroup(group, panelId);
  panelVisibility[panelId] = false;
}

function openPanel(panelId: PanelKey) {
  if (panelVisibility[panelId]) return;
  panelVisibility[panelId] = true;
  if (!panelGroups.value.length) {
    panelGroups.value = [{ id: createId(), tabs: [panelId], activeTab: panelId, width: 100 }];
    return;
  }
  const target = panelGroups.value.reduce((largest, group) => (group.width > largest.width ? group : largest), panelGroups.value[0]);
  if (target.tabs.includes(panelId)) {
    target.activeTab = panelId;
    return;
  }
  target.tabs.push(panelId);
  target.activeTab = panelId;
}
</script>
