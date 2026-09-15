import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'colog' | 'colog-dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'colog-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(STORAGE_KEY) === 'colog-dark' ? 'colog-dark' : 'colog')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(current => current === 'colog' ? 'colog-dark' : 'colog') }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
