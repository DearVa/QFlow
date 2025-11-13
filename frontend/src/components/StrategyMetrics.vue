<template>
  <div class="metrics">
    <h3>Backtest Metrics</h3>
    <div class="grid">
      <div v-for="metric in marketStore.metrics" :key="metric.label" class="metric">
        <span class="label">{{ metric.label }}</span>
        <span class="value">{{ metric.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarketStore } from '../stores/market';

const marketStore = useMarketStore();
</script>

<style scoped>
.metrics {
  background: #0b1120;
  border-radius: 12px;
  padding: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.metric {
  background: #111c34;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.value {
  font-size: 1.1rem;
  font-weight: 600;
}
</style>
