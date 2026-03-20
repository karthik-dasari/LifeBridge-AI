import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HospitalAuth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!hospitalName.trim()) {
          setError('Hospital name is required')
          setLoading(false)
          return
        }
        await register(email, password)
      }
      navigate('/hospital')
    } catch (err) {
      const msg = err?.code || err?.message || 'Authentication failed'
      const friendly = {
        'auth/invalid-credential': 'Invalid email or password',
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many attempts. Try again later',
      }
      setError(friendly[msg] || msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <span className="text-4xl" aria-hidden="true">🏥</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              {isLogin ? 'Hospital Login' : 'Register Hospital'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isLogin
                ? 'Sign in to access your hospital dashboard'
                : 'Create an account for your hospital'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-label={isLogin ? 'Hospital login form' : 'Hospital registration form'}>
            {!isLogin && (
              <div>
                <label htmlFor="hospital-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital Name
                </label>
                <input
                  id="hospital-name"
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g., Apollo Hospital"
                  aria-required="true"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hospital@example.com"
                required
                aria-required="true"
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                aria-required="true"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin" aria-hidden="true">⏳</span> Please wait...
                </>
              ) : isLogin ? (
                <><span aria-hidden="true">🔐</span> Sign In</>
              ) : (
                <><span aria-hidden="true">📋</span> Register</>
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {isLogin
                ? "Don't have an account? Register here"
                : 'Already registered? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
