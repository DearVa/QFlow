<template>
  <div class="grid h-full gap-3 overflow-auto rounded-lg border border-slate-900 bg-slate-950 p-4 sm:grid-cols-2">
    <div
      v-for="metric in marketStore.metrics"
      :key="metric.label"
      class="rounded-lg border border-slate-800 bg-slate-950 p-4"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{{ metric.label }}</p>
      <p class="pt-2 text-2xl font-semibold text-white">{{ metric.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarketStore } from '../stores/market';

const marketStore = useMarketStore();
</script>
