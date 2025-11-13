<template>
  <h3
    v-bind="$attrs"
    :class="['text-2xl font-semibold leading-tight text-white', props.class]"
  >
    <slot />
  </h3>
</template>

<script setup lang="ts">
const props = defineProps<{ class?: string }>();
</script>
