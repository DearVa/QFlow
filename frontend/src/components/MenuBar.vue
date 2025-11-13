<template>
  <header
    class="flex items-center justify-between border-b border-slate-900 bg-slate-950/95 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.4em]"
  >
    <div class="flex items-center gap-4">
      <span class="text-sm font-semibold text-white tracking-[0.5em]">QFlow Studio</span>
      <div class="flex items-center gap-2 text-slate-400">
        <button class="rounded px-2 py-1 hover:bg-slate-900/70">File</button>
        <button class="rounded px-2 py-1 hover:bg-slate-900/70">Edit</button>
        <button class="rounded px-2 py-1 hover:bg-slate-900/70">Run</button>
      </div>
    </div>
    <div class="flex items-center gap-3 text-slate-200">
      <details class="relative">
        <summary
          class="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.45em] text-slate-300 hover:bg-slate-900/70"
        >
          View
        </summary>
        <div
          class="absolute right-0 mt-2 min-w-[220px] rounded-md border border-slate-800 bg-slate-950/95 p-2 text-[12px] font-normal uppercase tracking-[0.2em] text-slate-200 shadow-xl"
        >
          <p class="px-2 pb-2 text-[10px] uppercase tracking-[0.45em] text-slate-500">Panels</p>
          <button
            v-for="panel in props.panels"
            :key="panel.id"
            class="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[12px] normal-case tracking-normal text-slate-200 hover:bg-slate-900"
            @click.prevent="$emit('toggle-panel', panel.id)"
          >
            <span>{{ panel.label }}</span>
            <span class="text-xs text-slate-500">{{ panel.active ? '●' : '○' }}</span>
          </button>
          <div class="mt-2 border-t border-slate-800 pt-2">
            <button
              class="w-full rounded px-2 py-1 text-left text-[12px] normal-case tracking-normal text-slate-200 hover:bg-slate-900"
              @click.prevent="$emit('reset-layout')"
            >
              Reset layout
            </button>
          </div>
        </div>
      </details>
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  panels: { id: string; label: string; active: boolean }[];
}>();

defineEmits<{
  (event: 'toggle-panel', id: string): void;
  (event: 'reset-layout'): void;
}>();
</script>
