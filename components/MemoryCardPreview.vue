<script setup lang="ts">
defineProps<{
  sample?: boolean
}>()
</script>

<template>
  <article
    class="memory-preview polaroid-card"
    :class="{ 'memory-preview--sample': sample }"
  >

    <header class="memory-preview__head">
      <div>
        <p class="memory-preview__eyebrow">Örnek hafıza kartı</p>
        <h3 class="memory-preview__title">Yeşil Bursa Müzesi</h3>
        <span class="memory-preview__tag">MÜZE</span>
      </div>
      <PassportStamp date="12.08.26" size="sm" />
    </header>

    <div class="memory-preview__rating" aria-label="4 yıldız">
      <span v-for="star in 5" :key="star" :class="{ active: star <= 4 }">★</span>
    </div>

    <blockquote class="memory-preview__note">
      “Osmanlı döneminden kalma seramikler çok etkileyiciydi. Bir daha gitmek isterim.”
    </blockquote>

    <footer class="memory-preview__foot">
      <span class="memory-preview__meta">KAYIT · 05.08.26</span>
    </footer>
  </article>
</template>

<style scoped>
.memory-preview {
  padding: 1.45rem 1.4rem 1.3rem;
}

.memory-preview--sample {
  opacity: 1;
}

.memory-preview__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.memory-preview__eyebrow {
  margin: 0 0 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-subtle);
}

.memory-preview__title {
  margin: 0 0 0.4rem;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--secondary);
}

.memory-preview__tag {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border: none;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--primary);
  background: rgba(255, 90, 31, 0.14);
}

.memory-preview__rating {
  display: flex;
  gap: 0.125rem;
  margin-bottom: 0.625rem;
  color: var(--border);
  font-size: 0.8125rem;
}

.memory-preview__rating .active {
  color: var(--primary);
}

.memory-preview__note {
  margin: 0 0 0.75rem;
  padding-left: 0.75rem;
  border-left: 2px solid var(--primary);
  font-family: var(--font-display);
  font-size: 0.875rem;
  font-style: italic;
  line-height: 1.55;
  color: var(--text-muted);
}

.memory-preview__foot {
  padding-top: 0.625rem;
  border-top: 1px solid var(--border-light);
}

.memory-preview__meta {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text-subtle);
}
</style>
