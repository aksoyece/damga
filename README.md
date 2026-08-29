# Şehir Hafızası

Kişisel şehir hafıza uygulaması — OpenStreetMap ve Nominatim kullanarak şehir/mekan arayın, haritada görüntüleyin, kaydedin ve not alın.

## Proje Yapısı

```
components/
├── Map.vue
├── SearchInput.vue
├── PlaceCard.vue
├── PlaceDetails.vue
└── CategoryFilter.vue

composables/
├── useNominatim.ts
└── usePlaces.ts

stores/
└── places.ts

types/
└── place.ts

pages/
├── index.vue
├── saved.vue
└── place/
    └── [id].vue
```

## Kurulum

```bash
npm install
npm run dev
```

## Teknolojiler

- Nuxt 4 / Vue 3
- Pinia
- Leaflet
- Nominatim + Overpass API (OpenStreetMap)
