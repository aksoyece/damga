export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'damga-theme'

function resolvePreferredTheme(): ThemeMode {
  if (!import.meta.client) return 'light'

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const theme = useState<ThemeMode>('theme', () => 'light')

  function applyTheme(mode: ThemeMode) {
    theme.value = mode

    if (!import.meta.client) return

    document.documentElement.dataset.theme = mode
    localStorage.setItem(STORAGE_KEY, mode)

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', mode === 'dark' ? '#121218' : '#FF5A1F')
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function initTheme() {
    applyTheme(resolvePreferredTheme())
  }

  return {
    theme,
    toggleTheme,
    initTheme,
    applyTheme,
  }
}
