<template>
  <p
    v-bind="$attrs"
    :class="['text-sm text-slate-400', props.class]"
  >
    <slot />
  </p>
</template>

<script setup lang="ts">
const props = defineProps<{ class?: string }>();
</script>
