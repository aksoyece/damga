<script setup lang="ts">
import type { CategoryOption } from '~/types/place'

defineProps<{
  modelValue: string
  categories: CategoryOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="category-filter">
    <p class="category-filter__label">Kategori</p>
    <p v-if="disabled" class="category-filter__hint">
      Kategoriler keşfedilen mekanlardan oluşur.
    </p>
    <p v-else-if="categories.length <= 1" class="category-filter__hint">
      Bu bölgede kategori bulunamadı.
    </p>
    <div v-else class="category-filter__options">
      <button
        v-for="category in categories"
        :key="category.value"
        type="button"
        class="category-filter__button"
        :class="{ 'category-filter__button--active': modelValue === category.value }"
        @click="emit('update:modelValue', category.value)"
      >
        {{ category.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.category-filter {
  margin-top: 1rem;
}

.category-filter__label {
  margin: 0 0 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.category-filter__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.category-filter__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.category-filter__button {
  padding: 0.35rem 0.8rem;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.category-filter__button:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.category-filter__button--active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: none;
}
</style>
