export default defineNuxtPlugin(() => {
  void import('leaflet')

  ;['/markers/marker-icon.png', '/markers/marker-icon-2x.png'].forEach((src) => {
    const img = new Image()
    img.src = src
  })
})
