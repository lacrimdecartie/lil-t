// components/ThemeToggle.tsx
'use client'
import { useTheme } from 'next-themes'
import * as React from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full text-left px-3 py-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
      aria-label="Toggle dark mode"
    >
      {isDark ? 'Switch to Light' : 'Switch to Dark'}
    </button>
  )
}
