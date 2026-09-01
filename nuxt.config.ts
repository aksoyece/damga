// https://nuxt.com/docs/api/configuration/nuxt-config
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://damga.vercel.app'

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
      siteUrl,
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
          href: 'https://a.tile.openstreetmap.org',
        },
        {
          rel: 'preconnect',
          href: 'https://b.tile.openstreetmap.org',
        },
        {
          rel: 'dns-prefetch',
          href: 'https://c.tile.openstreetmap.org',
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
          name: 'color-scheme',
          content: 'light dark',
        },
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
          content: `${siteUrl}/og-image.png`,
        },
        {
          property: 'og:url',
          content: siteUrl,
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
      script: [
        {
          key: 'theme-init',
          innerHTML: `(function(){try{var s=localStorage.getItem('damga-theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`,
          type: 'text/javascript',
          tagPosition: 'head',
        },
      ],
    },
  },
})
