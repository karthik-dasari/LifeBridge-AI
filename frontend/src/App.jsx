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
          <Navbar />
          <Routes>
            <Route path="/" element={<UserPage />} />
            <Route path="/hospital" element={<HospitalDashboard />} />
            <Route path="/hospital/auth" element={<HospitalAuth />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
