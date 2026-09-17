import { Link, Navigate } from 'react-router-dom'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../context/ThemeContext'
import PublicDemoEditor from '../components/PublicDemoEditor'
import reactLogo from '../../assets/React.svg'
import typeScriptLogo from '../../assets/TypeScript.svg'
import viteLogo from '../../assets/Vite.js.svg'
import javaLogo from '../../assets/Java.svg'
import springLogo from '../../assets/Spring.svg'
import redisLogo from '../../assets/Redis.svg'
import postgresLogo from '../../assets/PostgresSQL.svg'
import dockerLogo from '../../assets/Docker.svg'
import githubActionsLogo from '../../assets/GitHub Actions.svg'
import renderLogo from '../../assets/Render Symbol SVG.svg'
import yjsLogo from '../../assets/yjs.svg'
import WebSocketLogo from '../../assets/websocket.svg'
import aivenLogo from '../../assets/aiven.jpg'
import cloudflareLogo from '../../assets/cloudflare.svg'
import upstashLogo from '../../assets/upstash.svg'

const stack = [
  ['React', reactLogo],
  ['TypeScript', typeScriptLogo],
  ['Vite', viteLogo],
  ['Java', javaLogo],
  ['Spring', springLogo],
  ['Redis', redisLogo],
  ['PostgreSQL', postgresLogo],
  ['Docker', dockerLogo],
  ['GitHub Actions', githubActionsLogo],
  ['Y.js', yjsLogo],
  ['WebSocket', WebSocketLogo],
  ['Render', renderLogo],
  ['Aiven', aivenLogo],
  ['Cloudflare', cloudflareLogo],
  ['Upstash', upstashLogo],

]
const documentationUrl = '#'

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
          <p className="text-sm font-bold uppercase tracking-[0.4em] text-primary">Rycca's Build Series</p>
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-sky-100">Pet Project #1 </p>
          <h1 className="mt-4 text-6xl font-black tracking-[-0.06em] sm:text-8xl">CoLog</h1>
          <p className="mt-4 text-lg text-base-content/60">A real-time collaborative diary and journaling platform built for shared writing, communication, and synchronization. </p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/register" className="btn btn-primary btn-lg">Get
            started</Link><Link to="/login" className="btn btn-ghost btn-lg">Log in</Link></div>
          <a href={documentationUrl} className="btn btn-secondary btn-sm mt-5 shadow-lg">Read the dev blog here</a>
        </div>
        <div>
          <PublicDemoEditor/>
        </div>
      </section>

      <section className="mx-auto max-w-2xl">
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">Experimented with:</p>
        <div className="rounded-2xl border border-base-300 bg-base-100 py-4 shadow-sm">
          <div className="marquee-mask mx-auto max-w-xl overflow-hidden" aria-label="Technology used by CoLog">
            <div className="marquee-track">{[...stack, ...stack].map(([name, logo], index) => <span key={`${name}-${index}`} className="mx-3 inline-flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-[#d4d4d4] bg-[#ededed] px-3 py-2 text-xs font-bold text-[#303030] shadow-[0_2px_6px_rgba(30,30,30,.08)]"><img src={logo} alt="" className="h-5 w-5 object-contain" />{name}</span>)}</div>
          </div>
        </div>
      </section>


    </main>
  </div>
}
