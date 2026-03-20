import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'

const UserPage = lazy(() => import('./pages/UserPage'))
const HospitalDashboard = lazy(() => import('./pages/HospitalDashboard'))
const HospitalAuth = lazy(() => import('./pages/HospitalAuth'))

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content">
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>}>
              <Routes>
                <Route path="/" element={<UserPage />} />
                <Route path="/hospital" element={<HospitalDashboard />} />
                <Route path="/hospital/auth" element={<HospitalAuth />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
