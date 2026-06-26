export function useTheme() {
  const isDark = useState<boolean>('isDark', () => false)

  function init() {
    if (!import.meta.client) return
    const saved = localStorage.getItem('bloom_theme')
    if (saved) {
      isDark.value = saved === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('bloom_theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  function applyTheme() {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  return { isDark, init, toggle }
}
