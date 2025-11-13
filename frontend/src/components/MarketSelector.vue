<template>
  <div class="selector">
    <label for="symbol">Symbol</label>
    <select id="symbol" v-model="selected" @change="onChange">
      <option v-for="symbol in symbols" :key="symbol" :value="symbol">{{ symbol }}</option>
    </select>
    <button @click="refresh">Refresh</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useMarketStore } from '../stores/market';

const marketStore = useMarketStore();
const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const selected = ref(marketStore.symbol);

const onChange = () => {
  marketStore.setSymbol(selected.value);
};

const refresh = () => {
  marketStore.fetchCandles();
};
</script>

<style scoped>
.selector {
  display: flex;
  gap: 1rem;
  align-items: center;
}

select,
button {
  background: #0f172a;
  color: white;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
}

button {
  cursor: pointer;
}
</style>
