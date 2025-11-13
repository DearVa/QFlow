<template>
  <div class="grid h-full gap-3 overflow-auto rounded-2xl border border-border/60 bg-card/80 p-4 sm:grid-cols-2">
    <div
      v-for="metric in marketStore.metrics"
      :key="metric.label"
      class="rounded-xl border border-border/50 bg-background/70 p-4"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{{ metric.label }}</p>
      <p class="pt-2 text-2xl font-semibold text-foreground">{{ metric.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarketStore } from '@/stores/market';

const marketStore = useMarketStore();
</script>
