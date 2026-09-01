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
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" stroke-width="1.75" />
      <path
        d="M12 2.75v2.1M12 19.15v2.1M4.85 4.85l1.48 1.48M17.67 17.67l1.48 1.48M2.75 12h2.1M19.15 12h2.1M4.85 19.15l1.48-1.48M17.67 6.33l1.48-1.48"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      class="theme-toggle__icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 14.4A7.5 7.5 0 0 1 9.6 3a6.6 6.6 0 1 0 11.4 11.4Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), color var(--transition), background var(--transition);
}

.theme-toggle:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.theme-toggle__icon {
  width: 1.125rem;
  height: 1.125rem;
}
</style>
