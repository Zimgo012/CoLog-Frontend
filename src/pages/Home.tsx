import { Link, Navigate } from 'react-router-dom'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../context/ThemeContext'
import PublicDemoEditor from '../components/PublicDemoEditor'

const stack = ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'daisyUI', 'Yjs', 'ProseMirror', 'STOMP', 'WebSockets']

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()

  if (isAuthenticated) return <Navigate to="/diary" replace />

  return <div className="min-h-screen bg-base-200">
    <header className="container mx-auto flex items-center justify-between px-5 py-5 md:px-8">
      <Link to="/" className="text-xl font-extrabold tracking-tight">CoLog</Link>
      <div className="flex items-center gap-2">
        <button type="button" onClick={toggleTheme} className="btn btn-ghost btn-sm btn-circle" aria-label={theme === 'colog' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'colog' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
        </button>
        <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
        <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
      </div>
    </header>

    <main>
      <section className="container mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:px-8 lg:min-h-[66vh] lg:grid-cols-2 lg:py-20">
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Pet project # 1</p>
          <h1 className="mt-4 text-6xl font-black tracking-[-0.06em] sm:text-8xl">CoLog</h1>
          <p className="mt-4 text-lg text-base-content/60">A shared space for thoughts, notes, and every version in between.</p>
          <div className="mt-8 flex gap-3"><Link to="/register" className="btn btn-primary btn-lg">Get started</Link><Link to="/login" className="btn btn-ghost btn-lg">Log in</Link></div>
        </div>
        <div>
          <div className="mb-5"><h2 className="text-2xl font-black tracking-[-0.035em]">Try the live demo</h2><p className="mt-1 text-sm text-base-content/60">Open this page in another tab and edit together.</p></div>
          <PublicDemoEditor />
        </div>
      </section>

      <section className="mx-auto max-w-2xl">
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">Built with:</p>
        <div className="rounded-2xl border border-base-300 bg-base-100 py-4 shadow-sm">
          <div className="marquee-mask mx-auto max-w-xl overflow-hidden" aria-label="Technology used by CoLog">
            <div className="marquee-track">{[...stack, ...stack].map((name, index) => <span key={`${name}-${index}`}
                                                                                            className="mx-3 inline-flex items-center gap-3 whitespace-nowrap text-sm font-bold text-base-content/65"><span
                className="h-2 w-2 rounded-full bg-primary"/>{name}</span>)}</div>
          </div>
        </div>
      </section>


    </main>
  </div>
}
