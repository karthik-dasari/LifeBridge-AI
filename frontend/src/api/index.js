import axios from 'axios'
import { auth } from '../firebase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Attach Firebase ID token to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken()
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // If token fetch fails, proceed without auth header
  }
  return config
})

export const analyzeEmergency = (data) => {
  return apiClient.post('/analyze-emergency', data)
}

export const matchHospitals = (data) => {
  return apiClient.post('/match-hospitals', data)
}

export const alertHospital = (data) => {
  return apiClient.post('/alert-hospital', data)
}

export const getHospitals = () => {
  return apiClient.get('/hospitals')
}

export const updateLiveLocation = (alertId, lat, lng) => {
  return apiClient.post('/location-update', { alert_id: alertId, lat, lng })
}

export const getLiveLocation = (alertId) => {
  return apiClient.get(`/live-location/${alertId}`)
}

export const registerHospital = (data) => {
  return apiClient.post('/hospitals/register', data)
}

export default apiClient
