import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import UserPage from './pages/UserPage'
import HospitalDashboard from './pages/HospitalDashboard'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<UserPage />} />
          <Route path="/hospital" element={<HospitalDashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
