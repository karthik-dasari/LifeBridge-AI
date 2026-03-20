import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import UserPage from './pages/UserPage'
import HospitalDashboard from './pages/HospitalDashboard'
import HospitalAuth from './pages/HospitalAuth'

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
            <Routes>
              <Route path="/" element={<UserPage />} />
              <Route path="/hospital" element={<HospitalDashboard />} />
              <Route path="/hospital/auth" element={<HospitalAuth />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
