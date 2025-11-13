<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="flex min-h-screen flex-col">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>
