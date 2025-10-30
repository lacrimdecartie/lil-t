// components/Header.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import * as React from 'react'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur dark:bg-neutral-900/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Brand (Logo statt Text) */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.png" width={28} height={28} alt="lil-t logo" />
          <span className="sr-only">lil-t</span>
        </Link>

        {/* Hamburger */}
        <div className="relative">
          <button
            aria-label="Open menu"
            onClick={() => setOpen(v => !v)}
            className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                <Link href="/" className="block px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => setOpen(false)}>
                  Home
                </Link>
                <Link href="/health" className="block px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => setOpen(false)}>
                  Health
                </Link>
                <div className="my-1 border-t dark:border-neutral-800" />
                <ThemeToggle />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
