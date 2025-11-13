<template>
  <section
    v-bind="$attrs"
    :class="[
      'rounded-3xl border border-slate-800/60 bg-slate-950/60 shadow-[0px_35px_120px_-15px_rgba(2,6,23,0.8)] backdrop-blur-xl transition hover:border-emerald-500/40',
      props.class
    ]"
  >
    <slot />
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{ class?: string }>();
</script>
