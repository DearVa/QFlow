<template>
  <div class="flex w-full flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
    <div class="flex min-w-[200px] flex-1 flex-col">
      <label for="symbol" class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Symbol</label>
      <select
        id="symbol"
        v-model="selected"
        @change="onChange"
        class="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-400/40"
      >
        <option v-for="symbol in symbols" :key="symbol" :value="symbol">{{ symbol }}</option>
      </select>
    </div>
    <Button variant="outline" size="sm" @click="refresh">Refresh</Button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { useMarketStore } from '@/stores/market';

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
