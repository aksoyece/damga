<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: number | string
  variant?: 'default' | 'small'
}>(), {
  size: 40,
  variant: 'default',
})

const strokeWidth = computed(() => (props.variant === 'small' ? 5 : 3))
const dashArray = computed(() => (props.variant === 'small' ? '6 5' : '5 4'))
</script>

<template>
  <svg
    class="logo"
    :width="size"
    :height="size"
    viewBox="0 0 140 140"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <circle
      cx="70"
      cy="65"
      r="40"
      fill="none"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :stroke-dasharray="dashArray"
    />
    <path
      d="M70 45 C61 45 54 52 54 61 C54 73 70 88 70 88 C70 88 86 73 86 61 C86 52 79 45 70 45 Z"
      fill="currentColor"
    />
    <circle cx="70" cy="60" r="5" fill="white" />
  </svg>
</template>

<style scoped>
.logo {
  display: block;
  flex-shrink: 0;
}
</style>
