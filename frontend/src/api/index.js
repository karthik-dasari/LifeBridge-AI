import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export default apiClient
