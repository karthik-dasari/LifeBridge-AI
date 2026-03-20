import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock API
vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  analyzeEmergency: vi.fn(),
  matchHospitals: vi.fn(),
  alertHospital: vi.fn(),
  updateLiveLocation: vi.fn(),
}))

// Mock child components to isolate page logic
vi.mock('../components/EmergencyForm', () => ({
  default: ({ onAnalyze, loading }) => (
    <div data-testid="emergency-form">
      <button data-testid="analyze-btn" onClick={() => onAnalyze({ input_text: 'chest pain', location: 'Hyderabad', lat: 17.38, lng: 78.48 })}>
        Analyze
      </button>
      {loading && <span data-testid="loading">loading</span>}
    </div>
  ),
}))

vi.mock('../components/AnalysisResult', () => ({
  default: ({ analysis }) => analysis ? <div data-testid="analysis-result">{analysis.emergency_type}</div> : null,
}))

vi.mock('../components/HospitalList', () => ({
  default: ({ matches, onAlert, onShowRoute }) => (
    <div data-testid="hospital-list">
      {matches.map((m) => (
        <div key={m.hospital.id}>
          <span>{m.hospital.name}</span>
          <button data-testid={`alert-${m.hospital.id}`} onClick={() => onAlert(m.hospital.id)}>Alert</button>
          <button data-testid={`route-${m.hospital.id}`} onClick={() => onShowRoute(m.hospital.id)}>Route</button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('../components/MapView', () => ({
  default: () => <div data-testid="map-view" />,
}))

import UserPage from '../pages/UserPage'
import { analyzeEmergency, matchHospitals, alertHospital, updateLiveLocation } from '../api'

describe('UserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock geolocation - watchPosition calls the success callback
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn((successCb) => {
          // Call the success callback to exercise startLocationBroadcast
          successCb({ coords: { latitude: 17.39, longitude: 78.49 } })
          return 1
        }),
        clearWatch: vi.fn(),
      },
      configurable: true,
    })
  })

  it('renders page title', () => {
    render(<UserPage />)
    expect(screen.getByText('🚨 Emergency Response')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<UserPage />)
    expect(screen.getByText(/Describe your emergency/)).toBeInTheDocument()
  })

  it('renders emergency form', () => {
    render(<UserPage />)
    expect(screen.getByTestId('emergency-form')).toBeInTheDocument()
  })

  it('analyzes emergency and shows results', async () => {
    analyzeEmergency.mockResolvedValue({
      data: {
        emergency_type: 'cardiac',
        severity: 'critical',
        required_facilities: ['ICU', 'Cardiology'],
        confidence_score: 0.95,
      },
    })
    matchHospitals.mockResolvedValue({
      data: {
        matches: [{
          hospital: { id: 'h1', name: 'Apollo', location: { lat: 17.43, lng: 78.46 }, facilities: ['ICU'], availability: { icu_beds: 5, emergency_slots: 10 } },
          match_score: 85, distance_km: 3.5, match_type: 'exact',
        }],
      },
    })

    render(<UserPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('analyze-btn'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('analysis-result')).toBeInTheDocument()
      expect(screen.getByText('cardiac')).toBeInTheDocument()
    })
  })

  it('shows error when API fails', async () => {
    analyzeEmergency.mockRejectedValue(new Error('Network error'))

    render(<UserPage />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('analyze-btn'))
    })

    await waitFor(() => {
      expect(screen.getByText(/Failed to analyze emergency/)).toBeInTheDocument()
    })
  })

  it('sends alert to hospital', async () => {
    analyzeEmergency.mockResolvedValue({
      data: { emergency_type: 'cardiac', severity: 'critical', required_facilities: ['ICU'], confidence_score: 0.95 },
    })
    matchHospitals.mockResolvedValue({
      data: { matches: [{ hospital: { id: 'h1', name: 'Apollo', location: { lat: 17.43, lng: 78.46 }, facilities: ['ICU'], availability: { icu_beds: 5, emergency_slots: 10 } }, match_score: 85, distance_km: 3.5, match_type: 'exact' }] },
    })
    alertHospital.mockResolvedValue({ data: { alert_id: 'a1', status: 'sent' } })
    updateLiveLocation.mockResolvedValue({ data: { status: 'ok' } })

    render(<UserPage />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('analyze-btn'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('hospital-list')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('alert-h1'))
    })

    expect(alertHospital).toHaveBeenCalled()
  })

  it('handles alert failure', async () => {
    analyzeEmergency.mockResolvedValue({
      data: { emergency_type: 'cardiac', severity: 'critical', required_facilities: ['ICU'], confidence_score: 0.95 },
    })
    matchHospitals.mockResolvedValue({
      data: { matches: [{ hospital: { id: 'h1', name: 'Apollo', location: { lat: 17.43, lng: 78.46 }, facilities: ['ICU'], availability: { icu_beds: 5, emergency_slots: 10 } }, match_score: 85, distance_km: 3.5, match_type: 'exact' }] },
    })
    alertHospital.mockRejectedValue(new Error('fail'))

    render(<UserPage />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('analyze-btn'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('hospital-list')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('alert-h1'))
    })

    await waitFor(() => {
      expect(screen.getByText(/Failed to send alert/)).toBeInTheDocument()
    })
  })

  it('shows map when matches exist', async () => {
    analyzeEmergency.mockResolvedValue({
      data: { emergency_type: 'cardiac', severity: 'critical', required_facilities: ['ICU'], confidence_score: 0.95 },
    })
    matchHospitals.mockResolvedValue({
      data: { matches: [{ hospital: { id: 'h1', name: 'Apollo', location: { lat: 17.43, lng: 78.46 }, facilities: ['ICU'], availability: { icu_beds: 5, emergency_slots: 10 } }, match_score: 85, distance_km: 3.5, match_type: 'exact' }] },
    })

    render(<UserPage />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('analyze-btn'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('map-view')).toBeInTheDocument()
    })
  })

  it('does not show map when no matches', () => {
    render(<UserPage />)
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument()
  })

  it('does not alert when no analysis', async () => {
    // UserPage starts with no analysis, calling handleAlert won't work
    // This is a no-op scenario we confirm doesn't crash
    render(<UserPage />)
    // No analysis yet, so can't trigger alert
    expect(screen.queryByTestId('alert-h1')).not.toBeInTheDocument()
  })
})
