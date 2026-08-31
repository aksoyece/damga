<script setup lang="ts">
import type { SearchResult } from '~/types/place'

const props = defineProps<{
  loading?: boolean
  error?: string | null
  results?: SearchResult[]
  selectionMade?: boolean
  autofocus?: boolean
}>()

const emit = defineEmits<{
  search: [query: string]
  select: [result: SearchResult]
  clear: []
}>()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => emit('search', query.value), 450)
}

function onSelect(result: SearchResult) {
  query.value = result.displayName.split(',')[0] ?? result.displayName
  emit('select', result)
}

function onClear() {
  query.value = ''
  emit('clear')
}

onMounted(() => {
  if (props.autofocus) {
    nextTick(() => inputRef.value?.focus())
  }
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="search-input">
    <div class="search-input__field">
      <input
        id="location-search"
        ref="inputRef"
        v-model="query"
        type="search"
        placeholder="Şehir, semt veya adres…"
        autocomplete="off"
        @input="onInput"
      >
      <button
        v-if="query"
        type="button"
        class="search-input__clear"
        aria-label="Aramayı temizle"
        @click="onClear"
      >
        ×
      </button>
    </div>

    <p v-if="loading" class="search-input__status">
      <span class="loading-pill">Aranıyor</span>
    </p>

    <p v-else-if="error" class="search-input__status search-input__status--error">
      {{ error }}
    </p>

    <ul
      v-else-if="results && results.length > 0 && query.length >= 2"
      class="search-input__results"
    >
      <li
        v-for="result in results"
        :key="result.id"
        class="polaroid-card search-input__result-card"
      >
        <button type="button" class="search-input__result" @click="onSelect(result)">
          <span class="search-input__result-tag">KONUM</span>
          <span>{{ result.displayName }}</span>
        </button>
      </li>
    </ul>

    <p
      v-else-if="results && results.length === 0 && query.length >= 2 && !loading && !selectionMade"
      class="search-input__status search-input__status--empty"
    >
      Sonuç bulunamadı. Farklı bir yazım deneyin.
    </p>
  </div>
</template>

<style scoped>
.search-input {
  position: relative;
}

.search-input__field {
  position: relative;
}

.search-input__field input {
  width: 100%;
  padding: 0.75rem 2.25rem 0.75rem 0.875rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  color: var(--text);
  font-size: 0.875rem;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.search-input__field input::placeholder {
  color: var(--text-subtle);
}

.search-input__field input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-card);
}

/* Tarayıcı varsayılan arama çarpısı — özel temizle butonu kullanılıyor */
.search-input__field input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}

.search-input__field input[type='search']::-ms-clear {
  display: none;
}

.search-input__clear {
  position: absolute;
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.875rem;
  cursor: pointer;
}

.search-input__status {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
}

.search-input__status--error {
  color: var(--danger);
}

.search-input__status--empty {
  color: var(--text-muted);
}

.search-input__results {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 0.65rem);
  left: 0;
  right: 0;
  max-height: 18rem;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  padding: 0.75rem;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: none;
  border-radius: 18px;
  background: var(--bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.search-input__result-card {
  margin: 0;
}

.search-input__result {
  display: grid;
  gap: 0.3rem;
  width: 100%;
  padding: 1rem 1.1rem 0.95rem;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  line-height: 1.4;
  cursor: pointer;
}

.search-input__result:hover {
  background: transparent;
}

.search-input__result-tag {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--primary);
}
</style>
