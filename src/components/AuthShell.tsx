import { Link } from 'react-router-dom'
import { ArrowLeftIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../context/ThemeContext'
import type { ReactNode } from 'react'

export default function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  return <main className="relative flex min-h-screen items-center justify-center bg-base-200 px-5 py-20 sm:px-8">
    <Link to="/" className="btn btn-ghost btn-sm absolute left-5 top-5 gap-1.5 sm:left-8 sm:top-8"><ArrowLeftIcon className="h-4 w-4" />Back to home</Link>
    <button type="button" onClick={toggleTheme} className="btn btn-ghost btn-sm btn-circle absolute right-5 top-5 sm:right-8 sm:top-8" aria-label={theme === 'colog' ? 'Switch to dark mode' : 'Switch to light mode'}>{theme === 'colog' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}</button>
    <div className="w-full max-w-md"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">{title}</h1><p className="mt-2 text-sm text-base-content/60">{description}</p><div className="mt-7">{children}</div></div>
  </main>
}
