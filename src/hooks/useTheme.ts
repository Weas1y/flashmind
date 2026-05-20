import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "flashmind_theme"

function getSystemPreference(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "dark") return true
  if (stored === "light") return false
  return getSystemPreference()
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement
  if (isDark) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const initial = getInitialTheme()
    applyTheme(initial)
    return initial
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        setIsDark(e.matches)
        applyTheme(e.matches)
      }
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      applyTheme(next)
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light")
      return next
    })
  }, [])

  return { isDark, toggle }
}