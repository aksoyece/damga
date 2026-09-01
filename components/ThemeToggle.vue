<script setup lang="ts">
const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'"
    :title="theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'"
    @click="toggleTheme"
  >
    <svg
      v-if="theme === 'dark'"
      class="theme-toggle__icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        d="M12 2.5v2.25M12 19.25v2.25M4.72 4.72l1.59 1.59M17.69 17.69l1.59 1.59M2.5 12h2.25M19.25 12h2.25M4.72 19.28l1.59-1.59M17.69 6.31l1.59-1.59"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      class="theme-toggle__icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M21 12.58A8.5 8.5 0 1 1 11.42 3a6.75 6.75 0 1 0 9.58 9.58Z"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.375rem;
  height: 2.375rem;
  padding: 0;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), color var(--transition), background var(--transition), transform var(--transition);
}

.theme-toggle:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.theme-toggle:active {
  transform: scale(0.96);
}

.theme-toggle__icon {
  width: 1.2rem;
  height: 1.2rem;
}
</style>
