const INTERACTIVE_SELECTOR = 'input, textarea, select, [contenteditable="true"], a, button, .btn, label[for], .filter-tabs__btn'

export default defineNuxtPlugin(() => {
  if (typeof document === 'undefined') {
    return
  }

  document.addEventListener('mousedown', (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (target.closest(INTERACTIVE_SELECTOR)) {
      return
    }

    event.preventDefault()
    window.getSelection()?.removeAllRanges()
  })
})
