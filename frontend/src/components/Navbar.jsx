import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const { user } = useAuth()

  const linkClass = (path) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-white text-indigo-700 shadow-sm'
        : 'text-indigo-100 hover:bg-indigo-500'
    }`

  return (
    <nav className="bg-indigo-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="text-white text-xl font-bold">LifeBridge AI</span>
          </Link>
          <div className="flex gap-2 items-center">
            <Link to="/" className={linkClass('/')}>
              Emergency
            </Link>
            <Link
              to={user ? '/hospital' : '/hospital/auth'}
              className={linkClass(user ? '/hospital' : '/hospital/auth')}
            >
              {user ? '📊 Dashboard' : '🔐 Hospital Login'}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
