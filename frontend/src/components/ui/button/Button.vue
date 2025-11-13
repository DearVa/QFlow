<template>
  <button
    v-bind="$attrs"
    :class="computedClass"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline';
type Size = 'default' | 'sm' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
  }>(),
  {
    variant: 'default',
    size: 'default',
    fullWidth: false
  }
);

const baseClass =
  'inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-60';

const variants: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-900 hover:bg-white border-slate-200',
  secondary: 'bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-900/80',
  ghost: 'border-transparent bg-transparent text-slate-300 hover:bg-slate-900/40',
  outline: 'border-slate-700 text-slate-100 hover:bg-slate-900/60'
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base'
};

const computedClass = computed(() => {
  return [
    baseClass,
    variants[props.variant],
    sizes[props.size],
    props.fullWidth ? 'w-full' : ''
  ]
    .filter(Boolean)
    .join(' ');
});
</script>
