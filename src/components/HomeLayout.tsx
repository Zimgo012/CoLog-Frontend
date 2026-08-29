import { Outlet } from 'react-router-dom'

export default function HomeLayout() {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <p>© {new Date().getFullYear()} CoLog. All rights reserved.</p>
      </footer>
    </div>
  )
}
