<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__inner">
        <NuxtLink to="/" class="layout__brand">
          <span class="layout__brand-mark" aria-hidden="true">
            <Logo :size="40" />
          </span>
          <span class="layout__brand-text">
            <strong>Şehir Hafızası</strong>
            <small>Kişisel gezi günlüğü</small>
          </span>
        </NuxtLink>

        <nav class="layout__nav">
          <NuxtLink to="/">Günlük</NuxtLink>
          <NuxtLink to="/saved">Arşivim</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="layout__main">
      <NuxtPage />
    </main>

    <footer class="layout__footer">
      <div class="layout__footer-inner">
        Konum verileri OpenStreetMap · Notlarınız yalnızca tarayıcınızda saklanır
      </div>
    </footer>
  </div>
</template>
