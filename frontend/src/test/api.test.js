import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

// Mock firebase before api/index.js imports it
vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  default: {},
}))

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    post: vi.fn(),
    get: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return { default: mockAxios }
})

import apiClient, {
  analyzeEmergency,
  matchHospitals,
  alertHospital,
  getHospitals,
  updateLiveLocation,
  getLiveLocation,
  registerHospital,
} from '../api/index'

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports a default apiClient', () => {
    expect(apiClient).toBeDefined()
  })

  it('analyzeEmergency calls POST /analyze-emergency', async () => {
    const mockData = { input_text: 'chest pain', location: 'Hyderabad' }
    apiClient.post.mockResolvedValue({ data: { emergency_type: 'cardiac' } })
    const result = await analyzeEmergency(mockData)
    expect(apiClient.post).toHaveBeenCalledWith('/analyze-emergency', mockData)
    expect(result.data.emergency_type).toBe('cardiac')
  })

  it('matchHospitals calls POST /match-hospitals', async () => {
    const mockData = { required_facilities: ['ICU'], emergency_type: 'cardiac', severity: 'critical' }
    apiClient.post.mockResolvedValue({ data: { matches: [] } })
    const result = await matchHospitals(mockData)
    expect(apiClient.post).toHaveBeenCalledWith('/match-hospitals', mockData)
    expect(result.data.matches).toEqual([])
  })

  it('alertHospital calls POST /alert-hospital', async () => {
    const mockData = { hospital_id: 'h1', emergency: 'cardiac', eta: '10 mins', requirements: ['ICU'] }
    apiClient.post.mockResolvedValue({ data: { alert_id: 'a1', status: 'sent' } })
    const result = await alertHospital(mockData)
    expect(apiClient.post).toHaveBeenCalledWith('/alert-hospital', mockData)
    expect(result.data.status).toBe('sent')
  })

  it('getHospitals calls GET /hospitals', async () => {
    apiClient.get.mockResolvedValue({ data: [{ id: 'h1' }] })
    const result = await getHospitals()
    expect(apiClient.get).toHaveBeenCalledWith('/hospitals')
    expect(result.data).toHaveLength(1)
  })

  it('updateLiveLocation calls POST /location-update', async () => {
    apiClient.post.mockResolvedValue({ data: { status: 'ok' } })
    const result = await updateLiveLocation('alert1', 17.0, 78.0)
    expect(apiClient.post).toHaveBeenCalledWith('/location-update', {
      alert_id: 'alert1', lat: 17.0, lng: 78.0,
    })
    expect(result.data.status).toBe('ok')
  })

  it('getLiveLocation calls GET /live-location/:alertId', async () => {
    apiClient.get.mockResolvedValue({ data: { lat: 17.0, lng: 78.0 } })
    const result = await getLiveLocation('alert1')
    expect(apiClient.get).toHaveBeenCalledWith('/live-location/alert1')
    expect(result.data.lat).toBe(17.0)
  })

  it('registerHospital calls POST /hospitals/register', async () => {
    const mockData = { name: 'Test Hospital' }
    apiClient.post.mockResolvedValue({ data: { id: 'h6', status: 'registered' } })
    const result = await registerHospital(mockData)
    expect(apiClient.post).toHaveBeenCalledWith('/hospitals/register', mockData)
    expect(result.data.status).toBe('registered')
  })
})
