import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
      <h1 className="text-8xl font-bold text-primary">404</h1>
      <p className="text-2xl font-semibold">Page Not Found</p>
      <p className="text-base-content/60">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary mt-4">
        Back to Home
      </Link>
    </div>
  )
}
