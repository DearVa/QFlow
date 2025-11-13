<template>
  <div class="dashboard">
    <section class="panel left">
      <MarketSelector />
      <ChartPanel />
    </section>
    <section class="panel right">
      <StrategyNodeEditor />
      <StrategyMetrics />
    </section>
  </div>
</template>

<script setup lang="ts">
import ChartPanel from '../components/ChartPanel.vue';
import StrategyNodeEditor from '../components/StrategyNodeEditor.vue';
import StrategyMetrics from '../components/StrategyMetrics.vue';
import MarketSelector from '../components/MarketSelector.vue';
</script>

<style scoped>
.dashboard {
  display: grid;
  gap: 1rem;
  grid-template-columns: 3fr 2fr;
  height: calc(100vh - 140px);
}

.panel {
  background: #111c34;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.left {
  min-width: 0;
}

.right {
  min-width: 0;
}

@media (max-width: 1024px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
}
</style>
