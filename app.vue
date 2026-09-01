<script setup lang="ts">
const route = useRoute()
const homeReset = useState('home-reset', () => 0)

function goHome(event: MouseEvent) {
  homeReset.value += 1
  if (route.path === '/') {
    event.preventDefault()
  }
}
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__inner">
        <NuxtLink to="/" class="layout__brand" aria-label="Ana ekrana dön" @click="goHome">
          <span class="layout__brand-mark" aria-hidden="true">
            <Logo :size="40" />
          </span>
          <span class="layout__brand-text">
            <strong>Damga</strong>
            <small>Kişisel gezi defteri</small>
          </span>
        </NuxtLink>

        <div class="layout__actions">
          <ThemeToggle />
          <nav class="layout__nav">
            <NuxtLink to="/">Günlük</NuxtLink>
            <NuxtLink to="/saved">Arşivim</NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="layout__main">
      <NuxtPage />
    </main>

    <footer class="layout__footer">
      <div class="layout__footer-inner">
        <p class="layout__footer-note">
          Konum verileri OpenStreetMap · Listeniz, notlarınız ve puanlarınız yalnızca tarayıcınızda saklanır
        </p>
        <p class="layout__footer-credit">
          © 2026 Damga · Designed &amp; developed by
          <a
            href="https://www.linkedin.com/in/eceaksoy16"
            target="_blank"
            rel="noopener noreferrer"
            class="layout__footer-link"
          >Ece Aksoy</a>
        </p>
      </div>
    </footer>
  </div>
</template>
