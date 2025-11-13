<template>
  <div class="layout">
    <header>
      <h1>QFlow - Quant Strategy Workbench</h1>
      <p>Composable node-based quant strategies with real-time Binance data.</p>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: #0f172a;
  color: white;
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

main {
  flex: 1;
  background: #0b1120;
  padding: 1rem;
}
</style>
