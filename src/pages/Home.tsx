import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex flex-col">

      {/* Hero */}
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center flex-col gap-8">
          <div>
            <h1 className="text-6xl font-extrabold text-primary">CoLog</h1>
            <p className="mt-4 text-xl text-base-content/70 max-w-md">
              A smarter way to track, collaborate, and stay on top of your work.
            </p>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="btn btn-primary btn-lg">
              Login
            </Link>
            <Link to="/register" className="btn btn-outline btn-lg">
              Get Started
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 w-full max-w-3xl">
            {[
              { icon: '📋', title: 'Track', desc: 'Log and monitor activity in real time.' },
              { icon: '🤝', title: 'Collaborate', desc: 'Work seamlessly with your team.' },
              { icon: '📊', title: 'Analyze', desc: 'Get insights from your data.' },
            ].map((f) => (
              <div key={f.title} className="card bg-base-100 shadow-md">
                <div className="card-body items-center text-center">
                  <span className="text-3xl">{f.icon}</span>
                  <h2 className="card-title">{f.title}</h2>
                  <p className="text-base-content/60 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
