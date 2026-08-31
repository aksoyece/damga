<script setup lang="ts">
import type { Place, SavedPlace } from '~/types/place'
import { getCategoryLabel } from '~/types/place'

const props = defineProps<{
  place: Place
  savedPlace?: SavedPlace | null
  loading?: boolean
  apiError?: string | null
}>()

const emit = defineEmits<{
  save: []
  remove: []
  markVisited: [visitedAt: string]
  updateVisitedAt: [visitedAt: string]
  updateRating: [rating: number]
  updateNote: [note: string]
}>()

const noteDraft = ref(props.savedPlace?.note ?? '')
const ratingDraft = ref(props.savedPlace?.rating ?? 0)
const visitDateDraft = ref(props.savedPlace?.visitedAt ?? todayISO())
const showLocationInfo = ref(false)

const maxVisitDate = todayISO()

watch(
  () => props.savedPlace,
  (value) => {
    noteDraft.value = value?.note ?? ''
    ratingDraft.value = value?.rating ?? 0
    visitDateDraft.value = value?.visitedAt ?? todayISO()
  },
)

function setRating(value: number) {
  ratingDraft.value = value
  emit('updateRating', value)
}

function submitNote() {
  emit('updateNote', noteDraft.value)
}

function submitVisitStamp() {
  if (!visitDateDraft.value) return
  emit('markVisited', visitDateDraft.value)
}

function submitVisitDateUpdate() {
  if (!visitDateDraft.value) return
  emit('updateVisitedAt', visitDateDraft.value)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const mapPlaces = computed(() => [props.place])

const savedLookup = computed(() =>
  props.savedPlace ? { [props.place.id]: props.savedPlace } : {},
)

const openStreetMapUrl = computed(() => {
  const { latitude, longitude } = props.place
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
})

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y.slice(2)}`
}
</script>

<template>
  <section class="place-details">
    <header class="place-details__header">
      <div class="place-details__intro">
        <span class="place-details__category">{{ getCategoryLabel(place.category) }}</span>
        <h1>{{ place.name }}</h1>
        <p v-if="place.address" class="place-details__address">{{ place.address }}</p>
      </div>

      <PassportStamp
        v-if="savedPlace?.status === 'visited'"
        :date="formatDate(savedPlace.visitedAt)"
        size="lg"
      />
    </header>

    <div class="place-details__journal">
      <div class="place-details__section place-details__section--primary">
        <h2>Günlük kaydınız</h2>
        <p class="place-details__hint">
          Puan, not ve ziyaret damgası yalnızca sizin cihazınızda saklanır.
        </p>

        <div v-if="savedPlace" class="place-details__personal">
          <div class="place-details__status-row">
            <PassportStamp
              v-if="savedPlace.status === 'visited'"
              :date="formatDate(savedPlace.visitedAt)"
            />
            <PassportStamp
              v-else
              label="PLAN"
              variant="planned"
            />
            <span v-if="savedPlace.savedAt" class="place-details__meta">
              Arşive eklendi · {{ formatDate(savedPlace.savedAt) }}
            </span>
          </div>

          <div class="place-details__field">
            <span class="place-details__field-label">Ziyaret tarihi</span>
            <p class="place-details__hint place-details__hint--inline">
              Gerçek ziyaret gününü seçin; arşive ekleme tarihinden farklı olabilir.
            </p>
            <input
              v-model="visitDateDraft"
              type="date"
              class="place-details__date-input"
              :max="maxVisitDate"
            >
            <button
              v-if="savedPlace.status === 'planned'"
              type="button"
              class="btn btn--primary btn--sm"
              @click="submitVisitStamp"
            >
              Ziyaret damgası bas
            </button>
            <button
              v-else
              type="button"
              class="btn btn--ghost btn--sm"
              @click="submitVisitDateUpdate"
            >
              Ziyaret tarihini kaydet
            </button>
          </div>

          <div class="place-details__field">
            <span class="place-details__field-label">Puanınız</span>
            <div class="place-details__stars">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="place-details__star"
                :class="{ 'place-details__star--active': star <= ratingDraft }"
                :aria-label="`${star} yıldız ver`"
                @click="setRating(star)"
              >
                ★
              </button>
            </div>
            <p v-if="ratingDraft" class="place-details__rating-label">{{ ratingDraft }}/5</p>
          </div>

          <label class="place-details__field">
            <span class="place-details__field-label">Notunuz</span>
            <textarea
              v-model="noteDraft"
              rows="5"
              placeholder="Bu mekana dair anılarınız, önerileriniz…"
            />
            <button type="button" class="btn btn--ghost btn--sm" @click="submitNote">
              Notu kaydet
            </button>
          </label>

          <div class="place-details__actions">
            <button type="button" class="btn btn--danger btn--sm" @click="emit('remove')">
              Arşivden kaldır
            </button>
          </div>
        </div>

        <div v-else class="place-details__empty-personal">
          <p>Bu mekan henüz arşivinizde değil. Ekledikten sonra puan, not ve damga ekleyebilirsiniz.</p>
          <button type="button" class="btn btn--primary" @click="emit('save')">
            Arşive ekle
          </button>
        </div>
      </div>

      <div class="place-details__section place-details__section--secondary">
        <button
          type="button"
          class="place-details__toggle"
          @click="showLocationInfo = !showLocationInfo"
        >
          {{ showLocationInfo ? '▾ Haritayı gizle' : '▸ Konumu haritada göster' }}
        </button>

        <div v-if="showLocationInfo" class="place-details__location">
          <p v-if="loading" class="place-details__hint">Konum yükleniyor…</p>
          <p v-else-if="apiError" class="place-details__hint place-details__hint--error">{{ apiError }}</p>

          <ClientOnly>
            <Map
              :center="[place.latitude, place.longitude]"
              :zoom="16"
              :places="mapPlaces"
              :saved-lookup="savedLookup"
              :selected-place-id="place.id"
              minimal
            />
            <template #fallback>
              <p class="place-details__hint">Harita yükleniyor…</p>
            </template>
          </ClientOnly>

          <p v-if="place.address" class="place-details__location-address">
            {{ place.address }}
          </p>

          <a
            class="place-details__osm-link"
            :href="openStreetMapUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap'te aç →
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.place-details__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 1.5rem 1.625rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow);
  position: relative;
}

.place-details__category {
  display: inline-block;
  margin-bottom: 0.45rem;
  padding: 0.15rem 0.5rem;
  border: 1.5px solid var(--primary);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-soft);}

.place-details__header h1 {
  margin: 0 0 0.375rem;
  font-family: var(--font-display);
  font-size: clamp(1.375rem, 3vw, 1.875rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--secondary);
}

.place-details__address {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.place-details__journal {
  display: grid;
  gap: 1rem;
}

.place-details__section {
  padding: 1.375rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  box-shadow: var(--shadow);
}

.place-details__section--primary {
  border-color: var(--primary);
  border-style: dashed;
}

.place-details__section h2 {
  margin: 0 0 0.375rem;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--secondary);
}

.place-details__hint {
  margin: 0 0 1.125rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.place-details__hint--error {
  color: var(--danger);
}

.place-details__status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.place-details__meta {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

.place-details__field {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.125rem;
}

.place-details__field-label {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-subtle);
}

.place-details__hint--inline {
  margin: 0 0 0.5rem;
}

.place-details__date-input {
  width: 100%;
  max-width: 14rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-hover);
  color: var(--text);
  font-family: var(--font-display);
  font-size: 0.9375rem;
  transition: border-color var(--transition);
}

.place-details__date-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-card);
}

.place-details__field textarea {
  width: 100%;
  padding: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-hover);
  color: var(--text);
  font-family: var(--font-display);
  font-size: 0.9375rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color var(--transition);
}

.place-details__field textarea:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-card);
}

.place-details__stars {
  display: flex;
  gap: 0.2rem;
}

.place-details__star {
  border: none;
  background: transparent;
  color: var(--border);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.place-details__star--active {
  color: var(--primary);
}

.place-details__rating-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--text-subtle);
}

.place-details__actions,
.place-details__empty-personal {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.place-details__empty-personal p {
  margin: 0 0 0.5rem;
  width: 100%;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}

.place-details__toggle {
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.place-details__toggle:hover {
  color: var(--text);
}

.place-details__location {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-light);
  display: grid;
  gap: 0.75rem;
}

.place-details__location-address {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.place-details__osm-link {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary);
}

.place-details__osm-link:hover {
  text-decoration: underline;
}
</style>
