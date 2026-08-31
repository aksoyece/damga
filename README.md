# Damga

Kişisel gezi defteri — bir şehirdeki ilgi çekici yerleri keşfedin, kendi gezi listenizi oluşturun, not alın ve ziyaretlerinizi damgalayın.

## Temel fikir

Bu projenin amacı yeni bir Google Maps alternatifi oluşturmak **değildir**.

OpenStreetMap ve Nominatim yalnızca şehirdeki veriyi sağlamak için kullanılır. Asıl uygulama değeri, kullanıcının bu veriler üzerine **kendi listesini ve notlarını** oluşturmasından gelir.

Bir kullanıcı birkaç ay sonra uygulamayı açtığında:

- *"Bursa'da hangi yerleri görmek istiyordum?"*
- *"Geçen ay gittiğim ve beğendiğim yerler hangileriydi?"*

sorularının cevabını **kendi verileri** üzerinden görebilmelidir.

Bu nedenle projenin odağı harita değil, **kişisel şehir hafızası**dır.

## Proje özeti

Damga, kullanıcıların bir şehirde bulunan ilgi çekici yerleri keşfedebileceği ve kendi gezi listesini oluşturabileceği bir web uygulamasıdır.

- **Harita tarafı:** OpenStreetMap verileri (Overpass API)
- **Arama:** Nominatim API (şehir, adres, mekan)
- **Kişisel veri:** Hesap veya backend yok — kaydedilen yerler, puanlar, notlar ve ziyaret durumları tarayıcının `localStorage` alanında tutulur

Böylece uygulama yalnızca bir harita arayüzü olmaktan çıkıp kullanıcının **kişisel gezi arşivine** dönüşür.

## Kurulum

```bash
npm install
npm run dev
```

## Teknolojiler

- Nuxt 4 / Vue 3
- Pinia (localStorage ile kalıcı arşiv)
- Leaflet (konum referansı — birincil deneyim değil)
- Nominatim + Overpass API (OpenStreetMap veri kaynağı)

## Proje yapısı

```
components/     # PlaceCard, Map, SearchInput, MemoryCardPreview…
composables/    # useNominatim, usePlaces
stores/         # places.ts — localStorage arşivi
pages/          # Günlük (index), Arşivim (saved), mekan detayı
server/api/     # Nominatim ve Overpass proxy (veri kaynağı)
```
