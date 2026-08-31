<script setup lang="ts">
withDefaults(defineProps<{
  date?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'visited' | 'planned'
}>(), {
  label: 'ZİYARET',
  size: 'md',
  variant: 'visited',
})
</script>

<template>
  <div
    class="passport-stamp"
    :class="[
      `passport-stamp--${size}`,
      `passport-stamp--${variant}`,
    ]"
    aria-label="Damga"
  >
    <svg class="passport-stamp__svg" viewBox="0 0 100 100" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-dasharray="8 5"
      />
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-dasharray="5 4"
        opacity="0.82"
      />
    </svg>
    <span class="passport-stamp__label">{{ label }}</span>
    <span v-if="date" class="passport-stamp__date">{{ date }}</span>
  </div>
</template>

<style scoped>
.passport-stamp {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  width: 4.75rem;
  height: 4.75rem;
  color: #C8102E;
  background: transparent;
  transform: rotate(-8deg);
  user-select: none;
  line-height: 1.1;
  text-align: center;
  flex-shrink: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
}

.passport-stamp__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  shape-rendering: geometricPrecision;
}

.passport-stamp__label {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.passport-stamp__date {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.passport-stamp--sm {
  width: 3.5rem;
  height: 3.5rem;
}

.passport-stamp--sm .passport-stamp__label {
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
}

.passport-stamp--sm .passport-stamp__date {
  font-size: 0.5rem;
}

.passport-stamp--md {
  width: 4.75rem;
  height: 4.75rem;
}

.passport-stamp--lg {
  width: 5.75rem;
  height: 5.75rem;
}

.passport-stamp--lg .passport-stamp__label {
  font-size: 0.75rem;
}

.passport-stamp--lg .passport-stamp__date {
  font-size: 0.625rem;
}

.passport-stamp--planned {
  color: #E03E00;
  transform: rotate(6deg);
}

.passport-stamp--visited {
  color: #C8102E;
}
</style>
