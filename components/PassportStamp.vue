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
      <ellipse
        cx="50"
        cy="50"
        rx="44"
        ry="40"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-dasharray="6 3.5 2 3.5 8 2.5"
        opacity="0.95"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="36"
        ry="32"
        fill="none"
        stroke="currentColor"
        stroke-width="1.1"
        stroke-dasharray="3 4 1.5 3"
        opacity="0.55"
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
  gap: 0.08rem;
  width: 4.6rem;
  height: 4.15rem;
  color: #C8102E;
  background: transparent;
  transform: rotate(-8deg);
  user-select: none;
  line-height: 1.05;
  text-align: center;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.12));
}

.passport-stamp__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.passport-stamp__label {
  position: relative;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.passport-stamp__date {
  position: relative;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.95;
}

.passport-stamp--sm {
  width: 2.75rem;
  height: 2.5rem;
}

.passport-stamp--sm .passport-stamp__label {
  font-size: 0.375rem;
  letter-spacing: 0.1em;
}

.passport-stamp--sm .passport-stamp__date {
  font-size: 0.3125rem;
}

.passport-stamp--md {
  width: 4.6rem;
  height: 4.15rem;
}

.passport-stamp--lg {
  width: 5.5rem;
  height: 5rem;
}

.passport-stamp--lg .passport-stamp__label {
  font-size: 0.65rem;
}

.passport-stamp--lg .passport-stamp__date {
  font-size: 0.55rem;
}

.passport-stamp--planned {
  color: #E03E00;
  transform: rotate(6deg);
}

.passport-stamp--visited {
  color: #C8102E;
}
</style>
