<template>
  <div
    v-bind="$attrs"
    :class="['flex flex-col gap-2 p-6 pb-4', props.class]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ class?: string }>();
</script>
