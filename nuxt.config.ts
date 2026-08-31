// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: '.',
  dir: {
    app: 'app',
  },
  modules: ['@pinia/nuxt'],
  css: ['~/app/assets/main.css', 'leaflet/dist/leaflet.css'],
  vite: {
    optimizeDeps: {
      include: ['leaflet'],
    },
  },
  runtimeConfig: {
    public: {
      cartoApiKey: '',
    },
  },
  nitro: {
    vercel: {
      config: {
        functions: {
          'api/overpass': {
            maxDuration: 30,
          },
          'api/places/nearby': {
            maxDuration: 60,
          },
        },
      },
    },
  },
  app: {
    head: {
      title: 'Damga',
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/icons/favicon-32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/icons/favicon-16.png',
        },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        {
          rel: 'preconnect',
          href: 'https://a.basemaps.cartocdn.com',
        },
        {
          rel: 'preconnect',
          href: 'https://b.basemaps.cartocdn.com',
        },
        {
          rel: 'dns-prefetch',
          href: 'https://server.arcgisonline.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap',
        },
      ],
      meta: [
        {
          name: 'description',
          content: 'Damga — kişisel gezi defteriniz. Mekan keşfedin, listenizi oluşturun, not alın ve ziyaretlerinizi damgalayın. Hesap yok; verileriniz tarayıcınızda kalır.',
        },
        {
          property: 'og:title',
          content: 'Damga',
        },
        {
          property: 'og:description',
          content: 'Damga — kişisel gezi defteriniz. Mekan keşfedin, listenizi oluşturun, not alın ve ziyaretlerinizi damgalayın. Hesap yok; verileriniz tarayıcınızda kalır.',
        },
        {
          property: 'og:image',
          content: 'https://sehir-hafizasi.vercel.app/og-image.png',
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          name: 'theme-color',
          content: '#FF5A1F',
        },
      ],
    },
  },
})
