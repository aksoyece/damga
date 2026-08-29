<script setup lang="ts">
import type { Place, SavedPlace } from '~/types/place'
import { getCategoryLabel } from '~/types/place'

const props = defineProps<{
  place: Place | SavedPlace
  saved?: boolean
  showActions?: boolean
  highlighted?: boolean
}>()

const emit = defineEmits<{
  save: []
  remove: []
  open: []
  markVisited: []
  select: []
}>()

const savedData = computed(() =>
  'status' in props.place ? props.place as SavedPlace : null,
)

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y.slice(2)}`
}
</script>

<template>
  <article
    class="place-card polaroid-card"
    :class="{
      'place-card--highlighted': highlighted,
      'place-card--saved': saved,
      'place-card--visited': savedData?.status === 'visited',
    }"
    @click="emit('select')"
  >

    <div class="place-card__body">
      <div class="place-card__header">
        <div class="place-card__info">
          <span class="place-card__category">{{ getCategoryLabel(place.category) }}</span>
          <h3 class="place-card__title">{{ place.name }}</h3>
        </div>

        <PassportStamp
          v-if="savedData?.status === 'visited'"
          :date="formatDate(savedData.visitedAt)"
          size="sm"
        />
        <PassportStamp
          v-else-if="savedData?.status === 'planned'"
          label="PLAN"
          variant="planned"
          size="sm"
        />
      </div>

      <p v-if="savedData?.note" class="place-card__note">{{ savedData.note }}</p>
      <p v-else-if="place.address" class="place-card__address">{{ place.address }}</p>

      <div v-if="savedData?.rating" class="place-card__rating">
        <span
          v-for="star in 5"
          :key="star"
          class="place-card__star"
          :class="{ 'place-card__star--active': star <= savedData.rating! }"
        >★</span>
        <span class="place-card__rating-text">{{ savedData.rating }}/5</span>
      </div>

      <footer v-if="savedData" class="place-card__meta">
        <span>KAYIT · {{ formatDate(savedData.savedAt) }}</span>
        <span v-if="savedData.visitedAt">ZİYARET · {{ formatDate(savedData.visitedAt) }}</span>
      </footer>

      <div v-if="showActions" class="place-card__actions" @click.stop>
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('open')">
          Günlük
        </button>
        <button
          v-if="savedData?.status === 'planned'"
          type="button"
          class="btn btn--primary btn--sm"
          @click="emit('markVisited')"
        >
          Damgala
        </button>
        <button
          v-if="!saved"
          type="button"
          class="btn btn--primary btn--sm"
          @click="emit('save')"
        >
          Arşive ekle
        </button>
        <button
          v-if="saved"
          type="button"
          class="btn btn--danger btn--sm"
          @click="emit('remove')"
        >
          Kaldır
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.place-card {
  cursor: pointer;
  position: relative;
  z-index: 1;
  height: 100%;
}

.place-card:hover {
  z-index: 10;
}

.place-card--highlighted {
  background: var(--primary-soft-hover);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}

.place-card--visited {
  background: var(--secondary-soft);
}

.place-card__body {
  padding: 1.35rem 1.35rem 1.2rem;
}

.place-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.place-card__category {
  display: inline-block;
  margin-bottom: 0.35rem;
  padding: 0.2rem 0.55rem;
  border: none;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary);
  background: rgba(255, 90, 31, 0.14);
}

.place-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: var(--secondary);
}

.place-card__address,
.place-card__note {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.place-card__note {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--text);
  padding-left: 0.625rem;
  border-left: 2px solid var(--primary);
}

.place-card__address {
  color: var(--text-muted);
}

.place-card__rating {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  margin-top: 0.5rem;
}

.place-card__star {
  color: var(--border);
  font-size: 0.8125rem;
}

.place-card__star--active {
  color: var(--primary);
}

.place-card__rating-text {
  margin-left: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-subtle);
}

.place-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border-light);
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

.place-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--border-light);
}
</style>
