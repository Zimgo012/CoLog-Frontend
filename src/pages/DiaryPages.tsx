import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, PlusIcon, DocumentTextIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

// ── Mock data ────────────────────────────────────────────────────────────────
const mockDiary = {
  id: '1',
  title: 'My Daily Thoughts',
  emoji: '📔',
  isOwner: true,
}

const mockPages = [
  { id: 'p1',  createdAt: '2024-03-10T08:30:00' },
  { id: 'p2',  createdAt: '2024-01-02T09:15:00' },
  { id: 'p3',  createdAt: '2024-06-18T07:45:00' },
  { id: 'p4',  createdAt: '2024-11-05T21:00:00' },
  { id: 'p5',  createdAt: '2024-12-31T02:13:00' },
  { id: 'p6',  createdAt: '2025-01-01T00:05:00' },
  { id: 'p7',  createdAt: '2025-04-12T10:00:00' },
  { id: 'p8',  createdAt: '2025-07-01T18:30:00' },
  { id: 'p9',  createdAt: '2025-10-20T16:00:00' },
  { id: 'p10', createdAt: '2025-12-30T22:00:00' },
  { id: 'p11', createdAt: '2026-01-03T08:00:00' },
  { id: 'p12', createdAt: '2026-03-15T09:45:00' },
  { id: 'p13', createdAt: '2026-05-28T14:00:00' },
  { id: 'p14', createdAt: '2026-08-10T23:50:00' },
  { id: 'p15', createdAt: '2026-08-29T20:00:00' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getYear(d: string)  { return new Date(d).getFullYear() }
function getMonth(d: string) { return new Date(d).getMonth() }   // 0-indexed

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DiaryPages() {
  const { id } = useParams()
  const navigate = useNavigate()

  const diary = mockDiary

  // Sort latest first
  const allPages = [...mockPages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Available years descending
  const years = [...new Set(allPages.map(p => getYear(p.createdAt)))].sort((a, b) => b - a)

  const [selectedYear, setSelectedYear]   = useState<number>(years[0])
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Months that have entries in selected year
  const activeMonths = [...new Set(
    allPages
      .filter(p => getYear(p.createdAt) === selectedYear)
      .map(p => getMonth(p.createdAt))
  )].sort((a, b) => a - b)

  // When year changes, reset month
  function handleYearChange(year: number) {
    setSelectedYear(year)
    setSelectedMonth(null)
  }

  const filtered = allPages.filter(p => {
    if (getYear(p.createdAt) !== selectedYear) return false
    if (selectedMonth !== null && getMonth(p.createdAt) !== selectedMonth) return false
    return true
  })

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-6">
        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={() => navigate('/diary')}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-xl font-extrabold text-primary">CoLog</span>
        </div>
        <div className="flex-none">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-9 flex items-center justify-center font-bold text-sm">
                JD
              </div>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48">
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a className="text-error">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">

        {/* Diary header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{diary.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{diary.title}</h1>
              <p className="text-base-content/40 text-xs mt-0.5">
                {allPages.length} {allPages.length === 1 ? 'entry' : 'entries'} total
              </p>
            </div>
          </div>
          {diary.isOwner && (
            <button className="btn btn-primary btn-sm gap-1">
              <PlusIcon className="w-4 h-4" />
              New Page
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="bg-base-100 rounded-2xl p-4 mb-6 shadow-sm flex flex-col gap-3">

          {/* Year pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-base-content/40 w-12">Year</span>
            <div className="flex gap-1.5 flex-wrap">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => handleYearChange(year)}
                  className={`btn btn-xs rounded-full px-3 transition-all ${
                    selectedYear === year ? 'btn-primary' : 'btn-ghost border border-base-300'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="divider my-0" />

          {/* Month pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-base-content/40 w-12">Month</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedMonth(null)}
                className={`btn btn-xs rounded-full px-3 transition-all ${
                  selectedMonth === null ? 'btn-secondary' : 'btn-ghost border border-base-300'
                }`}
              >
                All
              </button>
              {MONTHS.map((name, idx) => {
                const hasEntries = activeMonths.includes(idx)
                return (
                  <button
                    key={name}
                    onClick={() => hasEntries && setSelectedMonth(idx)}
                    disabled={!hasEntries}
                    className={`btn btn-xs rounded-full px-3 transition-all ${
                      selectedMonth === idx
                        ? 'btn-secondary'
                        : hasEntries
                        ? 'btn-ghost border border-base-300'
                        : 'btn-ghost opacity-25 cursor-not-allowed'
                    }`}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Result count */}
        <p className="text-xs text-base-content/40 mb-3 px-1">
          Showing {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          {selectedMonth !== null ? ` · ${MONTHS[selectedMonth]} ${selectedYear}` : ` · ${selectedYear}`}
        </p>

        {/* ── Page list ── */}
        {filtered.length === 0 ? (
          <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
            <div className="card-body items-center text-center py-16">
              <span className="text-4xl">🗂️</span>
              <p className="text-base-content/40 mt-2">No entries for this period.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((page, index) => (
              <div
                key={page.id}
                onClick={() => navigate(`/diary/${id}/pages/${page.id}`)}
                className="card bg-base-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <div className="card-body flex-row items-center gap-4 py-4 px-5">
                  {/* Index bubble */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/40 group-hover:bg-primary group-hover:text-primary-content transition-colors duration-200">
                    {index + 1}
                  </div>

          {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {formatDate(page.createdAt)}
                    </p>
                    <p className="text-xs text-base-content/40 mt-0.5">
                      {formatTime(page.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Chat button */}
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/diary/${id}/pages/${page.id}?panel=chat`) }}
                      className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Open chat"
                    >
                      <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-base-content/40" />
                    </button>
                    <DocumentTextIcon className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors duration-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <footer className="footer footer-center p-4 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
