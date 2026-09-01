import DiaryCard from '../components/DiaryCard'
import { BookOpenIcon, UsersIcon, PlusIcon } from '@heroicons/react/24/outline'



// Mock data — replace with API data later

//fetch diary/my
// sample diary out would be like so:
//
//{
//     "diaryId": 1,
//     "title": "diary1",
//     "createdAt": "2026-08-29",
//     "lastOpenedAt": "2026-08-29",
//     "documents": [
//         {
//             "documentId": 1,
//             "date": "2026-08-29T22:20:20.329643",
//             "yjsState": null
//         }
//     ],
//     "public": true
// }

const myDiaries = [
  {
    id: '1',
    title: 'My Daily Thoughts',
    createdAt: '2026-01-10',
    lastOpenedAt: '2026-08-28',
    emoji: '📔',
    color: 'bg-pink-100',
  },
  {
    id: '2',
    title: 'Travel Adventures',
    createdAt: '2026-03-05',
    lastOpenedAt: '2026-08-20',
    emoji: '✈️',
    color: 'bg-sky-100',
  },
  {
    id: '3',
    title: 'Recipe Collection',
    createdAt: '2026-05-18',
    lastOpenedAt: '2026-07-14',
    emoji: '🍳',
    color: 'bg-yellow-100',
  },
]

const collaboratedDiaries = [
  {
    id: '4',
    title: 'Team Sprint Log',
    createdAt: '2026-02-01',
    lastOpenedAt: '2026-08-29',
    emoji: '🗂️',
    color: 'bg-violet-100',
    owner: 'Maria Santos',
  },
  {
    id: '5',
    title: 'Book Club Notes',
    createdAt: '2026-06-12',
    lastOpenedAt: '2026-08-15',
    emoji: '📚',
    color: 'bg-emerald-100',
    owner: 'Luis Reyes',
  },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">

      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-6">
        <div className="flex-1">
          <span className="text-xl font-extrabold text-primary">CoLog</span>
        </div>
        <div className="flex-none gap-3 items-center">
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar placeholder"
            >
              <div className="bg-primary text-primary-content rounded-full w-9 flex items-center justify-center font-bold text-sm">
                JD
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48"
            >
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a className="text-error">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Good day, John! 👋</h1>
          <p className="text-base-content/50 mt-1 text-sm">Here are your diaries.</p>
        </div>

        {/* My Diaries */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">My Diaries</h2>
              <span className="badge badge-primary badge-sm">{myDiaries.length}</span>
            </div>
            <button className="btn btn-primary btn-sm gap-1">
              <PlusIcon className="w-4 h-4" />
              New Diary
            </button>
          </div>

          {myDiaries.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
              <div className="card-body items-center text-center py-12">
                <span className="text-4xl">📓</span>
                <p className="text-base-content/50 mt-2">No diaries yet. Create your first one!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myDiaries.map((diary) => (
                <DiaryCard key={diary.id} diary={diary} />
              ))}
            </div>
          )}
        </section>

        {/* Collaborated Diaries */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold">Collaborated Diaries</h2>
            <span className="badge badge-secondary badge-sm">{collaboratedDiaries.length}</span>
          </div>

          {collaboratedDiaries.length === 0 ? (
            <div className="card bg-base-100 shadow-sm border border-dashed border-base-300">
              <div className="card-body items-center text-center py-12">
                <span className="text-4xl">🤝</span>
                <p className="text-base-content/50 mt-2">
                  You haven't joined any shared diaries yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {collaboratedDiaries.map((diary) => (
                <DiaryCard key={diary.id} diary={diary} isCollaborated />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-100 text-base-content/40 text-xs border-t border-base-300">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
